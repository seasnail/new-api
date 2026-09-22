/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { ERROR_MESSAGES } from '../../constants'
import type {
  GeneratedImage,
  Message,
  ParameterEnabled,
  PlaygroundConfig,
  ResponsesEvent,
  ResponsesOutputItem,
  ResponsesRequest,
  ResponsesResponse,
  ResponsesInputPart,
} from '../../types'
import { completeAssistantMessage } from '../message/message-streaming-utils'
import { startReasoningTiming } from '../message/message-timing-utils'
import { getCurrentVersion } from '../message/message-utils'

export function isClaudeModel(model: string): boolean {
  return /(?:^|[/.:])claude(?:[-.]|$)/i.test(model.trim())
}

export function isResponsesEnabled(config: PlaygroundConfig): boolean {
  return config.apiMode === 'responses' && !isClaudeModel(config.model)
}

export function buildResponsesPayload(
  messages: Message[],
  config: PlaygroundConfig,
  enabled: ParameterEnabled
): ResponsesRequest {
  const input: ResponsesRequest['input'] = []
  for (const message of messages) {
    if (
      message.status === 'error' ||
      message.status === 'loading' ||
      message.status === 'streaming'
    ) {
      continue
    }
    const version = getCurrentVersion(message)
    if (message.from === 'user' && version.attachments?.length) {
      const content: ResponsesInputPart[] = []
      if (version.content.trim()) {
        content.push({ type: 'input_text', text: version.content })
      }
      for (const attachment of version.attachments) {
        if (attachment.text !== undefined) {
          content.push({
            type: 'input_text',
            text: `${attachment.filename}\n${attachment.text}`,
          })
        } else if (attachment.mediaType.startsWith('image/')) {
          content.push({ type: 'input_image', image_url: attachment.url })
        } else {
          content.push({
            type: 'input_file',
            filename: attachment.filename,
            file_data: attachment.url,
          })
        }
      }
      input.push({ role: 'user', content })
    } else if (version.content.trim()) {
      input.push({ role: message.from, content: version.content })
    }
    if (message.from === 'assistant') {
      for (const image of version.images ?? []) {
        // With store:false, upstream image-call IDs cannot be looked up on a
        // later turn. Replay the image bytes for results from either API.
        input.push({
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/${image.output_format};base64,${image.result}`,
            },
          ],
        })
      }
    }
  }
  const payload: ResponsesRequest = {
    model: config.model,
    group: config.group,
    input,
    stream: config.stream,
    store: false,
  }
  if (enabled.temperature) payload.temperature = config.temperature
  if (enabled.top_p) payload.top_p = config.top_p
  if (enabled.max_tokens) payload.max_output_tokens = config.max_tokens
  if (config.imageGeneration) {
    payload.tools = [{ type: 'image_generation', output_format: 'png' }]
    if (config.imageModel?.trim()) {
      payload.tools[0].model = config.imageModel.trim()
    }
  }
  return payload
}

export function getResponsesError(
  response: ResponsesResponse
): string | undefined {
  if (!response || typeof response !== 'object') {
    return ERROR_MESSAGES.PARSE_ERROR
  }
  if (response.error?.message) return response.error.message
  if (response.status === 'incomplete') {
    return ERROR_MESSAGES.RESPONSE_INCOMPLETE
  }
  if (response.status !== 'completed' || !Array.isArray(response.output)) {
    return ERROR_MESSAGES.API_REQUEST_ERROR
  }
  if (
    !response.output.some(
      (item) =>
        readGeneratedImage(item) ||
        (item.type === 'message' &&
          item.content?.some((part) => part.text || part.refusal))
    )
  ) {
    return ERROR_MESSAGES.API_REQUEST_ERROR
  }
}

function readGeneratedImage(
  item: ResponsesOutputItem
): GeneratedImage | undefined {
  if (
    item.type !== 'image_generation_call' ||
    item.status !== 'completed' ||
    !item.id ||
    !item.result
  ) {
    return
  }
  const format = item.output_format ?? 'png'
  if (format !== 'png' && format !== 'jpeg' && format !== 'webp') return
  // Only raster base64 output is rendered; never interpret arbitrary URLs or markup.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(item.result)) return
  return { id: item.id, result: item.result, output_format: format }
}

export function applyResponsesResponse(
  message: Message,
  response: ResponsesResponse
): Message {
  const images: GeneratedImage[] = []
  const text: string[] = []
  const reasoning: string[] = []
  for (const item of response.output ?? []) {
    const image = readGeneratedImage(item)
    if (image) images.push(image)
    if (item.type === 'message') {
      for (const part of item.content ?? []) {
        if (part.type === 'output_text' && part.text) text.push(part.text)
        if (part.type === 'refusal' && part.refusal) text.push(part.refusal)
      }
    }
    if (item.type === 'reasoning') {
      for (const part of item.summary ?? []) {
        if (part.text) reasoning.push(part.text)
      }
    }
  }
  return completeAssistantMessage({
    ...message,
    versions: [
      {
        ...getCurrentVersion(message),
        content: text.join('\n'),
        images,
        imagesOmitted: false,
      },
    ],
    reasoning: reasoning.length
      ? { ...startReasoningTiming(message), content: reasoning.join('\n') }
      : message.reasoning,
  })
}

export function applyResponsesEvent(
  message: Message,
  event: ResponsesEvent
): Message {
  if (message.status === 'error') return message
  if (event.type === 'response.completed' && event.response) {
    return applyResponsesResponse(message, event.response)
  }
  const version = getCurrentVersion(message)
  if (
    (event.type === 'response.output_text.delta' ||
      event.type === 'response.refusal.delta') &&
    event.delta
  ) {
    return {
      ...message,
      status: 'streaming',
      isReasoningStreaming: false,
      versions: [{ ...version, content: version.content + event.delta }],
    }
  }
  if (event.type === 'response.reasoning_summary_text.delta' && event.delta) {
    return {
      ...message,
      status: 'streaming',
      isReasoningStreaming: true,
      reasoning: {
        ...startReasoningTiming(message),
        content: (message.reasoning?.content ?? '') + event.delta,
      },
    }
  }
  if (event.type === 'response.output_item.done' && event.item) {
    const image = readGeneratedImage(event.item)
    if (image) {
      return {
        ...message,
        status: 'streaming',
        versions: [
          {
            ...version,
            images: [
              ...(version.images ?? []).filter(
                (existing) => existing.id !== image.id
              ),
              image,
            ],
          },
        ],
      }
    }
  }
  return message
}

export const RESPONSES_STREAM_EVENTS = [
  'response.output_text.delta',
  'response.refusal.delta',
  'response.reasoning_summary_text.delta',
  'response.output_item.done',
  'response.completed',
  'response.failed',
  'response.incomplete',
] as const
