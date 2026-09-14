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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  test('defaults to CC Switch setup images', async () => {
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
    expect(screen.getByRole('radio', { name: 'CC Switch' })).toBeChecked()
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 1' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 2' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 3' })
    ).toBeInTheDocument()
    expect(document.body).toHaveTextContent(
      'Quit ChatGPT and Codex completely before editing the provider configuration.'
    )
    expect(document.body).toHaveTextContent(
      'In CC Switch, select Codex, then click the plus button to add a provider.'
    )
    expect(document.body).toHaveTextContent(
      'Enter the provider name, API key, API request URL, and default model.'
    )
    expect(document.body).toHaveTextContent(
      'Find the new provider in the Codex list and click Enable.'
    )
    expect(document.body).toHaveTextContent(
      'Restart ChatGPT and Codex after completing these steps.'
    )
  })

  test('switches from CC Switch setup images to command-line instructions', async () => {
    mocks.getUserModels.mockResolvedValue({
      success: true,
      data: ['codex-model'],
    })
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <CodexConfigDrawer
          open
          onOpenChange={vi.fn()}
          apiKey={apiKey}
          tokenKey='sk-test'
        />
      </QueryClientProvider>
    )

    await user.click(screen.getByRole('radio', { name: 'Command line' }))
    expect(screen.getByRole('tab', { name: 'Windows' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.body).toHaveTextContent('model = "codex-model"')

    await user.click(screen.getByRole('radio', { name: 'CC Switch' }))
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 1' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 3' })
    ).toBeInTheDocument()
  })
})
