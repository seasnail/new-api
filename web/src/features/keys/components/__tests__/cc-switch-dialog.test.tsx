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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { CCSwitchDialog } from '@/features/keys/components/dialogs/cc-switch-dialog'
import type { ApiKey } from '@/features/keys/types'

const mocks = vi.hoisted(() => ({
  getUserModels: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getUserModels: mocks.getUserModels }))

const apiKey: ApiKey = {
  id: 42,
  name: 'Claude key',
  key: 'sk-quick-start',
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

afterEach(() => vi.restoreAllMocks())

test('defaults to a compatible application and warns on incompatible selection', async () => {
  mocks.getUserModels.mockResolvedValue({
    success: true,
    data: ['gpt-blocked', 'claude-sonnet', 'gemini-pro'],
  })
  const user = userEvent.setup()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const restrictedKey = {
    ...apiKey,
    model_limits_enabled: true,
    model_limits: 'gemini-pro',
  }
  render(
    <QueryClientProvider client={client}>
      <CCSwitchDialog
        open
        onOpenChange={() => undefined}
        apiKey={restrictedKey}
        tokenKey={apiKey.key}
      />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(screen.getByLabelText(/Primary Model/)).toHaveValue('gemini-pro')
  )

  expect(screen.getByRole('radio', { name: 'Gemini' })).toBeChecked()
  await user.click(screen.getByRole('radio', { name: 'Codex' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'no model available for selected application, please choose other keys support the model or other compatible application'
  )
  expect(screen.getByRole('alert')).toHaveClass('text-destructive')
  expect(screen.getByRole('button', { name: 'Open CC Switch' })).toBeDisabled()
})

test.each([false, true])(
  'does not show an empty-model warning while loading or after a fetch error (embedded: %s)',
  async (embedded) => {
    let rejectModels!: (reason: Error) => void
    mocks.getUserModels.mockReturnValue(
      new Promise((_, reject) => {
        rejectModels = reject
      })
    )
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <CCSwitchDialog
          open
          embedded={embedded}
          onOpenChange={() => undefined}
          apiKey={apiKey}
          tokenKey={apiKey.key}
        />
      </QueryClientProvider>
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const button = screen.getByRole('button', {
      name: embedded ? 'Import to CC Switch' : 'Open CC Switch',
    })
    expect(button).toBeDisabled()
    rejectModels(new Error('Network unavailable'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to fetch models'
    )
    expect(button).toBeDisabled()
  }
)

test.each([false, true])(
  'places the no-model warning beside the disabled import button (embedded: %s)',
  async (embedded) => {
    mocks.getUserModels.mockResolvedValue({ success: true, data: [] })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <CCSwitchDialog
          open
          embedded={embedded}
          onOpenChange={() => undefined}
          apiKey={apiKey}
          tokenKey={apiKey.key}
        />
      </QueryClientProvider>
    )
    await screen.findByRole('alert')
    const actions = screen.getByRole('group', { name: 'Import to CC Switch' })
    expect(actions).toHaveClass('flex', 'items-center')
    expect(within(actions).getByRole('alert')).toHaveClass('text-destructive')
    const button = within(actions).getByRole('button', {
      name: embedded ? 'Import to CC Switch' : 'Open CC Switch',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'aria-describedby',
      within(actions).getByRole('alert').id
    )
  }
)
