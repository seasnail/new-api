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
import type { Row } from '@tanstack/react-table'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { ApiKey } from '../../types'
import { DataTableRowActions } from '../data-table-row-actions'

const context = vi.hoisted(() => ({
  resolveRealKey: vi.fn(),
  setCurrentRow: vi.fn(),
  setOpen: vi.fn(),
  setResolvedKey: vi.fn(),
}))

vi.mock('../api-keys-provider', () => ({
  useApiKeys: () => ({
    ...context,
    triggerRefresh: vi.fn(),
    resolvedKeys: {},
    loadingKeys: {},
  }),
}))

vi.mock('@/features/chat/hooks/use-chat-presets', () => ({
  useChatPresets: () => ({ chatPresets: [], serverAddress: '' }),
}))

const apiKey: ApiKey = {
  id: 42,
  name: 'Codex key',
  key: 'masked',
  status: 1,
  remain_quota: 100,
  used_quota: 0,
  unlimited_quota: false,
  expired_time: -1,
  created_time: 1,
  accessed_time: 0,
  group: 'default',
  auto_groups: null,
  cross_group_retry: false,
  model_limits_enabled: false,
  model_limits: '',
  allow_ips: '',
}

describe('API key Codex config action', () => {
  test.each([
    ['Configure Codex', 'codex-config'],
    ['Configure Claude', 'claude-config'],
  ])(
    '%s resolves the full key before opening the config drawer',
    async (label, drawer) => {
      vi.clearAllMocks()
      context.resolveRealKey.mockResolvedValue('sk-full-key')

      render(<DataTableRowActions row={{ original: apiKey } as Row<ApiKey>} />)

      fireEvent.click(screen.getByRole('button', { name: label }))

      await waitFor(() => {
        expect(context.resolveRealKey).toHaveBeenCalledWith(42)
        expect(context.setResolvedKey).toHaveBeenCalledWith('sk-full-key')
        expect(context.setCurrentRow).toHaveBeenCalledWith(apiKey)
        expect(context.setOpen).toHaveBeenCalledWith(drawer)
      })
    }
  )
  test('does not open Claude configuration when key resolution fails', async () => {
    vi.clearAllMocks()
    context.resolveRealKey.mockResolvedValue(null)
    render(<DataTableRowActions row={{ original: apiKey } as Row<ApiKey>} />)
    fireEvent.click(screen.getByRole('button', { name: 'Configure Claude' }))
    await waitFor(() => expect(context.resolveRealKey).toHaveBeenCalledWith(42))
    expect(context.setOpen).not.toHaveBeenCalled()
    expect(context.setResolvedKey).not.toHaveBeenCalled()
  })
})
