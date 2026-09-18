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
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { CCSwitchDialog } from '@/features/keys/components/dialogs/cc-switch-dialog'
import type { ApiKey } from '@/features/keys/types'

const mocks = vi.hoisted(() => ({
  getUserModels: vi.fn(),
  getPricing: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getUserModels: mocks.getUserModels }))
vi.mock('@/features/pricing/api', () => ({ getPricing: mocks.getPricing }))

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

beforeEach(() => {
  mocks.getPricing.mockResolvedValue({ success: true, data: [] })
})

afterEach(() => vi.restoreAllMocks())

test('imports the cheapest allowed token model, breaking input-price ties by output price', async () => {
  mocks.getUserModels.mockResolvedValue({
    success: true,
    data: [
      'gpt-expensive',
      'gpt-cheap-input',
      'gpt-cheapest',
      'gpt-blocked',
      'claude-free',
      'gpt-dynamic',
      'gpt-request',
      'gpt-invalid',
    ],
  })
  mocks.getPricing.mockResolvedValue({
    success: true,
    data: [
      {
        model_name: 'gpt-expensive',
        quota_type: 0,
        model_ratio: 2,
        completion_ratio: 1,
      },
      {
        model_name: 'gpt-cheap-input',
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 4,
      },
      {
        model_name: 'gpt-cheapest',
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 2,
      },
      {
        model_name: 'gpt-blocked',
        quota_type: 0,
        model_ratio: 0,
        completion_ratio: 1,
      },
      {
        model_name: 'claude-free',
        quota_type: 0,
        model_ratio: 0,
        completion_ratio: 1,
      },
      {
        model_name: 'gpt-dynamic',
        quota_type: 0,
        model_ratio: 0,
        completion_ratio: 0,
        billing_mode: 'tiered_expr',
      },
      {
        model_name: 'gpt-request',
        quota_type: 1,
        model_ratio: 0,
        completion_ratio: 0,
      },
      {
        model_name: 'gpt-invalid',
        quota_type: 0,
        model_ratio: -1,
        completion_ratio: 1,
      },
    ],
  })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const user = userEvent.setup()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <CCSwitchDialog
        open
        embedded
        application='codex'
        onOpenChange={() => undefined}
        apiKey={{
          ...apiKey,
          model_limits_enabled: true,
          model_limits:
            'gpt-expensive,gpt-cheap-input,gpt-cheapest,claude-free,gpt-dynamic,gpt-request,gpt-invalid',
        }}
        tokenKey={apiKey.key}
      />
    </QueryClientProvider>
  )
  const button = screen.getByRole('button', { name: 'Import to CC Switch' })
  await waitFor(() => expect(button).toBeEnabled())
  expect(screen.getByLabelText(/Primary Model/)).toHaveValue('gpt-cheapest')
  await user.click(button)
  expect(new URL(String(open.mock.calls[0][0])).searchParams.get('model')).toBe(
    'gpt-cheapest'
  )

  await user.click(screen.getByLabelText(/Primary Model/))
  await user.click(screen.getByRole('option', { name: 'gpt-expensive' }))
  await user.click(button)
  expect(new URL(String(open.mock.calls[1][0])).searchParams.get('model')).toBe(
    'gpt-expensive'
  )
})

test.each(['free', 'missing', 'failed'])(
  'handles %s pricing without losing a usable default',
  async (scenario) => {
    mocks.getUserModels.mockResolvedValue({
      success: true,
      data: ['gpt-first', 'gpt-free'],
    })
    if (scenario === 'failed') {
      mocks.getPricing.mockRejectedValue(new Error('Pricing unavailable'))
    } else {
      mocks.getPricing.mockResolvedValue({
        success: true,
        data:
          scenario === 'free'
            ? [
                {
                  model_name: 'gpt-free',
                  quota_type: 0,
                  model_ratio: 0,
                  completion_ratio: 1,
                },
              ]
            : [],
      })
    }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <CCSwitchDialog
          open
          application='codex'
          onOpenChange={() => undefined}
          apiKey={apiKey}
          tokenKey={apiKey.key}
        />
      </QueryClientProvider>
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Open CC Switch' })
      ).toBeEnabled()
    )
    expect(screen.getByLabelText(/Primary Model/)).toHaveValue(
      scenario === 'free' ? 'gpt-free' : 'gpt-first'
    )
  }
)

test('waits for pricing before enabling import', async () => {
  mocks.getUserModels.mockResolvedValue({ success: true, data: ['gpt-first'] })
  let resolvePricing!: (value: { success: boolean; data: never[] }) => void
  mocks.getPricing.mockReturnValue(
    new Promise((resolve) => {
      resolvePricing = resolve
    })
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <CCSwitchDialog
        open
        application='codex'
        onOpenChange={() => undefined}
        apiKey={apiKey}
        tokenKey={apiKey.key}
      />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(screen.getByLabelText(/Primary Model/)).toHaveValue('gpt-first')
  )
  expect(screen.getByRole('button', { name: 'Open CC Switch' })).toBeDisabled()
  resolvePricing({ success: true, data: [] })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Open CC Switch' })).toBeEnabled()
  )
})

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
