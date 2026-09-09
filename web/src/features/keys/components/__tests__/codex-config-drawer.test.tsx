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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { ApiKey } from '../../types'
import { CodexConfigDrawer } from '../dialogs/codex-config-drawer'

const mocks = vi.hoisted(() => ({
  getUserModels: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getUserModels: mocks.getUserModels }))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { server_address: 'https://api.example.com' } }),
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

describe('Codex config drawer', () => {
  test('prefers an available Codex model and renders the shared instructions', async () => {
    mocks.getUserModels.mockResolvedValue({
      success: true,
      data: ['general-model', 'gpt-5.3-codex'],
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <CodexConfigDrawer
          open
          onOpenChange={vi.fn()}
          apiKey={apiKey}
          tokenKey='sk-full-key'
        />
      </QueryClientProvider>
    )

    expect(await screen.findByText('Configure Codex')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.body).toHaveTextContent('model = "gpt-5.3-codex"')
    })
    expect(document.body).toHaveTextContent('https://api.example.com/v1')
    expect(document.body).toHaveTextContent('sk-full-key')
  })
})
