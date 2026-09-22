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
import { describe, expect, test } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { createLoadingAssistantMessage } from '../../message/message-utils'
import { applyImageGenerationResponse, isImageGenerationModel } from '../images'
import { buildResponsesPayload } from '../responses'

describe('direct image results', () => {
  test.each([
    'gpt-image-2.5-sunburst',
    'gpt-image-2.5-flare',
    'openai/gpt-image-1',
  ])('recognizes image model %s', (model) => {
    expect(isImageGenerationModel(model)).toBe(true)
  })
  test.each([
    'gpt-5.6-luna',
    'claude-sonnet',
    'my-gpt-image-proxy',
    'gpt-image-1/chat',
  ])('does not misroute chat model %s', (model) => {
    expect(isImageGenerationModel(model)).toBe(false)
  })
  test('uses direct image bytes as image input when switching to Responses, not a fabricated tool call', () => {
    const message = applyImageGenerationResponse(
      createLoadingAssistantMessage(),
      { data: [{ b64_json: 'aGVsbG8=' }] }
    )
    expect(message.status).toBe('complete')
    expect(
      buildResponsesPayload(
        [message],
        DEFAULT_CONFIG,
        DEFAULT_PARAMETER_ENABLED
      ).input
    ).toEqual([
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' },
        ],
      },
    ])
  })
  test.each([
    { data: [{ b64_json: 'javascript:alert(1)' }] },
    { data: [{ b64_json: 'aGVsbG8=' }], output_format: 'svg' },
    { data: [] },
  ])('rejects unusable image output', (response) => {
    expect(() =>
      applyImageGenerationResponse(createLoadingAssistantMessage(), response)
    ).toThrow()
  })
})
