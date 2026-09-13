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
import { describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { getInitialPlaygroundConfig } from '../../state/playground-state-utils'
import { saveConfig } from '../../storage/storage'
import { buildChatCompletionPayload } from '../payload-builder'

describe('playground group inheritance', () => {
  it('ignores a saved group and lets chat requests inherit the current user group', () => {
    saveConfig({ ...DEFAULT_CONFIG, group: 'default' })
    const payload = buildChatCompletionPayload(
      [],
      getInitialPlaygroundConfig(),
      DEFAULT_PARAMETER_ENABLED
    )
    expect(payload.group).toBe('')
    localStorage.clear()
  })
})

describe('playground sampling parameters', () => {
  it('omits all optional parameters with default playground settings', () => {
    const payload = buildChatCompletionPayload(
      [],
      { ...DEFAULT_CONFIG, seed: 42 },
      DEFAULT_PARAMETER_ENABLED
    )
    expect(payload).toEqual({
      model: DEFAULT_CONFIG.model,
      group: DEFAULT_CONFIG.group,
      messages: [],
      stream: DEFAULT_CONFIG.stream,
    })
  })

  it.each([
    'claude-sonnet-4-6',
    'claude-sonnet-4-6-thinking',
    'anthropic.claude-sonnet-4-6',
  ])('omits top_p when both parameters are enabled for %s', (model) => {
    const payload = buildChatCompletionPayload(
      [],
      { ...DEFAULT_CONFIG, model, temperature: 0 },
      { ...DEFAULT_PARAMETER_ENABLED, temperature: true, top_p: true }
    )
    expect(payload.temperature).toBe(0)
    expect(payload).not.toHaveProperty('top_p')
  })

  it('preserves top_p when temperature is disabled for Sonnet 4.6', () => {
    const payload = buildChatCompletionPayload(
      [],
      { ...DEFAULT_CONFIG, model: 'claude-sonnet-4-6', top_p: 0.9 },
      { ...DEFAULT_PARAMETER_ENABLED, temperature: false, top_p: true }
    )
    expect(payload).not.toHaveProperty('temperature')
    expect(payload.top_p).toBe(0.9)
  })

  it('omits both sampling parameters when both are disabled', () => {
    const payload = buildChatCompletionPayload(
      [],
      { ...DEFAULT_CONFIG, model: 'claude-sonnet-4-6' },
      { ...DEFAULT_PARAMETER_ENABLED, temperature: false, top_p: false }
    )
    expect(payload).not.toHaveProperty('temperature')
    expect(payload).not.toHaveProperty('top_p')
  })

  it('preserves both sampling parameters for other models', () => {
    const payload = buildChatCompletionPayload([], DEFAULT_CONFIG, {
      ...DEFAULT_PARAMETER_ENABLED,
      temperature: true,
      top_p: true,
    })
    expect(payload.temperature).toBe(DEFAULT_CONFIG.temperature)
    expect(payload.top_p).toBe(DEFAULT_CONFIG.top_p)
  })
})
