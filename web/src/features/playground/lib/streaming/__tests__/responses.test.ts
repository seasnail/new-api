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
import { afterEach, describe, expect, test } from 'vitest'

import {
  DEFAULT_CONFIG,
  DEFAULT_PARAMETER_ENABLED,
  ERROR_MESSAGES,
  STORAGE_KEYS,
} from '../../../constants'
import type { ResponsesResponse } from '../../../types'
import {
  createLoadingAssistantMessage,
  createUserMessage,
} from '../../message/message-utils'
import {
  loadMessages,
  saveMessages,
  loadConfig,
  saveConfig,
} from '../../storage/storage'
import {
  applyResponsesEvent,
  applyResponsesResponse,
  buildResponsesPayload,
  getResponsesError,
} from '../responses'

const response: ResponsesResponse = {
  status: 'completed',
  output: [
    {
      type: 'message',
      content: [{ type: 'output_text', text: 'A friendly robot.' }],
    },
    {
      type: 'image_generation_call',
      id: 'img_1',
      status: 'completed',
      result: 'aGVsbG8=',
      output_format: 'png',
    },
  ],
}

afterEach(() => localStorage.clear())

describe('Responses requests and results', () => {
  test('sends the image tool and supported parameters while preserving explicit zero values', () => {
    const payload = buildResponsesPayload(
      [createUserMessage('Draw a robot'), createLoadingAssistantMessage()],
      {
        ...DEFAULT_CONFIG,
        imageGeneration: true,
        imageModel: ' gpt-image-2.5-sunburst ',
        temperature: 0,
        top_p: 0,
      },
      {
        temperature: true,
        top_p: true,
        max_tokens: true,
        seed: true,
        presence_penalty: true,
        frequency_penalty: true,
      }
    )
    expect(payload).toEqual({
      model: DEFAULT_CONFIG.model,
      group: '',
      input: [{ role: 'user', content: 'Draw a robot' }],
      stream: true,
      store: false,
      temperature: 0,
      top_p: 0,
      max_output_tokens: 4096,
      tools: [
        {
          type: 'image_generation',
          model: 'gpt-image-2.5-sunburst',
          output_format: 'png',
        },
      ],
    })
  })

  test('omits disabled tools and parameters and lets the provider choose a blank image model', () => {
    const config = { ...DEFAULT_CONFIG, imageModel: '   ' }
    expect(
      buildResponsesPayload([], config, DEFAULT_PARAMETER_ENABLED)
    ).not.toHaveProperty('tools')
    expect(
      buildResponsesPayload(
        [],
        { ...config, imageGeneration: true },
        DEFAULT_PARAMETER_ENABLED
      ).tools
    ).toEqual([{ type: 'image_generation', output_format: 'png' }])
  })

  test.each(['png', 'jpeg', 'webp'] as const)(
    'sends %s image bytes for stateless follow-up edits and excludes failed and pending replies',
    (format) => {
      const assistant = applyResponsesResponse(
        createLoadingAssistantMessage(),
        {
          ...response,
          output: [
            response.output[0],
            { ...response.output[1], output_format: format },
          ],
        }
      )
      const payload = buildResponsesPayload(
        [
          assistant,
          { ...assistant, status: 'error' },
          createUserMessage('Make it blue'),
          createLoadingAssistantMessage(),
        ],
        DEFAULT_CONFIG,
        DEFAULT_PARAMETER_ENABLED
      )
      expect(payload.input).toEqual([
        { role: 'assistant', content: 'A friendly robot.' },
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/${format};base64,aGVsbG8=`,
            },
          ],
        },
        { role: 'user', content: 'Make it blue' },
      ])
      expect(payload.store).toBe(false)
    }
  )

  test('keeps repeated text deltas and replaces streamed text with the completed snapshot', () => {
    let message = createLoadingAssistantMessage()
    message = applyResponsesEvent(message, {
      type: 'response.output_text.delta',
      delta: 'ha',
    })
    message = applyResponsesEvent(message, {
      type: 'response.output_text.delta',
      delta: 'ha',
    })
    expect(message.versions[0].content).toBe('haha')
    message = applyResponsesEvent(message, {
      type: 'response.completed',
      response,
    })
    expect(message.status).toBe('complete')
    expect(message.versions[0].content).toBe('A friendly robot.')
    expect(message.versions[0].images).toHaveLength(1)
  })

  test('deduplicates completed image items and accepts an image-only final reply', () => {
    const event = {
      type: 'response.output_item.done',
      item: response.output[1],
    }
    const message = applyResponsesEvent(
      applyResponsesEvent(createLoadingAssistantMessage(), event),
      event
    )
    expect(message.versions[0].images).toHaveLength(1)
    expect(
      getResponsesError({ ...response, output: [response.output[1]] })
    ).toBeUndefined()
  })

  test('shows refusals and surfaces empty, failed and incomplete responses', () => {
    const refused: ResponsesResponse = {
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'refusal', refusal: 'Cannot do that.' }],
        },
      ],
    }
    expect(
      applyResponsesResponse(createLoadingAssistantMessage(), refused)
        .versions[0].content
    ).toBe('Cannot do that.')
    expect(getResponsesError(refused)).toBeUndefined()
    expect(getResponsesError({ status: 'completed', output: [] })).toBe(
      ERROR_MESSAGES.API_REQUEST_ERROR
    )
    expect(
      getResponsesError({
        status: 'failed',
        output: [],
        error: { message: 'No image quota' },
      })
    ).toBe('No image quota')
    expect(
      getResponsesError({
        status: 'incomplete',
        output: [],
        incomplete_details: { reason: 'max_output_tokens' },
      })
    ).toBe(ERROR_MESSAGES.RESPONSE_INCOMPLETE)
  })

  test('does not render arbitrary URLs or unsupported image formats from upstream', () => {
    const unsafe: ResponsesResponse = {
      status: 'completed',
      output: [
        { ...response.output[1], result: 'javascript:alert(1)' },
        { ...response.output[1], output_format: 'svg' },
      ],
    }
    expect(
      applyResponsesResponse(createLoadingAssistantMessage(), unsafe)
        .versions[0].images
    ).toEqual([])
    expect(getResponsesError(unsafe)).toBe(ERROR_MESSAGES.API_REQUEST_ERROR)
  })

  test('persists settings and an image placeholder without storing image bytes or losing text history', () => {
    const config = {
      ...DEFAULT_CONFIG,
      apiMode: 'responses' as const,
      imageGeneration: true,
      imageModel: 'image-model',
    }
    saveConfig(config)
    expect(loadConfig()).toEqual(config)
    const imageOnly = applyResponsesResponse(createLoadingAssistantMessage(), {
      ...response,
      output: [response.output[1]],
    })
    saveMessages([createUserMessage('Draw a robot'), imageOnly])
    expect(localStorage.getItem(STORAGE_KEYS.MESSAGES)).not.toContain(
      'aGVsbG8='
    )
    const saved = loadMessages()
    expect(saved).toHaveLength(2)
    expect(saved?.[1].versions[0]).toMatchObject({
      content: '',
      imagesOmitted: true,
    })
    expect(saved?.[1].versions[0]).not.toHaveProperty('images')
    expect(imageOnly.versions[0].images).toHaveLength(1)
  })
})
