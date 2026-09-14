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
import { beforeEach, expect, test, vi } from 'vitest'

import { getUnmaskedApiKey } from '../api'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: mocks }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.get.mockResolvedValue({
    data: {
      success: true,
      data: { id: 42, key: 'masked****', group: 'default' },
    },
  })
})

test.each(['full-secret', 'sk-full-secret'])(
  'uses the full key without duplicating its prefix: %s',
  async (key) => {
    mocks.post.mockResolvedValue({ data: { success: true, data: { key } } })
    const result = await getUnmaskedApiKey(42)
    expect(result.data).toEqual({
      id: 42,
      key: 'sk-full-secret',
      group: 'default',
    })
    expect(mocks.get).toHaveBeenCalledWith('/api/token/42')
    expect(mocks.post).toHaveBeenCalledWith('/api/token/42/key')
  }
)

test.each([{ success: false }, { success: true, data: { key: '' } }])(
  'never falls back to a masked key when the secret is unavailable: %j',
  async (response) => {
    mocks.post.mockResolvedValue({ data: response })
    await expect(getUnmaskedApiKey(42)).rejects.toThrow(
      'Failed to load API key'
    )
  }
)
