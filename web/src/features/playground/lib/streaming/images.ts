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
  ImageGenerationRequest,
  ImageGenerationResponse,
  Message,
  PlaygroundConfig,
} from '../../types'
import { completeAssistantMessage } from '../message/message-streaming-utils'
import { getCurrentVersion } from '../message/message-utils'

export function isImageGenerationModel(model: string): boolean {
  return /(?:^|\/)gpt-image-[^/]+$/i.test(model.trim())
}

export function buildImageGenerationPayload(
  messages: Message[],
  config: PlaygroundConfig
): ImageGenerationRequest {
  let prompt = ''
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].from === 'user') {
      prompt = getCurrentVersion(messages[index]).content
      break
    }
  }
  return {
    model: config.model,
    group: config.group,
    prompt,
    n: 1,
    output_format: 'png',
  }
}

export function applyImageGenerationResponse(
  message: Message,
  response: ImageGenerationResponse
): Message {
  if (response?.error?.message) throw new Error(response.error.message)
  if (!Array.isArray(response?.data) || !response.data.length) {
    throw new Error(ERROR_MESSAGES.API_REQUEST_ERROR)
  }
  const format = response.output_format ?? 'png'
  if (format !== 'png' && format !== 'jpeg' && format !== 'webp') {
    throw new Error(ERROR_MESSAGES.PARSE_ERROR)
  }
  const images: GeneratedImage[] = response.data.map((item, index) => {
    if (
      typeof item?.b64_json !== 'string' ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(item.b64_json)
    ) {
      throw new Error(ERROR_MESSAGES.PARSE_ERROR)
    }
    return {
      id: `${message.key}-image-${index}`,
      source: 'images',
      result: item.b64_json,
      output_format: format,
    }
  })
  return completeAssistantMessage({
    ...message,
    versions: [
      {
        ...getCurrentVersion(message),
        content: '',
        images,
        imagesOmitted: false,
      },
    ],
  })
}
