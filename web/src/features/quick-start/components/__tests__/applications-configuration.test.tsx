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
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import type { ApiKey } from '@/features/keys/types'

import { ApplicationsConfiguration } from '../applications-configuration'

const mocks = vi.hoisted(() => ({
  getUserModels: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getUserModels: mocks.getUserModels }))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { server_address: 'https://api.example.com' } }),
}))

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

test('imports each application with its compatible allowed model and provider details', async () => {
  mocks.getUserModels.mockResolvedValue({
    success: true,
    data: ['gpt-blocked', 'claude-sonnet', 'gpt-allowed'],
  })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const user = userEvent.setup()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ApplicationsConfiguration
        apiKey={{
          ...apiKey,
          model_limits_enabled: true,
          model_limits: 'gpt-allowed,claude-sonnet',
        }}
      />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Import to CC Switch' })
    ).toBeEnabled()
  )
  expect(screen.getByLabelText('Name')).toHaveValue('One-Gateway')
  expect(screen.getByLabelText(/Primary Model/)).toHaveValue('gpt-allowed')
  await user.click(screen.getByRole('button', { name: 'Import to CC Switch' }))
  const codexUrl = new URL(String(open.mock.calls[0][0]))
  expect(codexUrl.protocol).toBe('ccswitch:')
  expect(codexUrl.searchParams.get('app')).toBe('codex')
  expect(codexUrl.searchParams.get('name')).toBe('One-Gateway')
  expect(codexUrl.searchParams.get('model')).toBe('gpt-allowed')
  expect(codexUrl.searchParams.get('apiKey')).toBe('sk-quick-start')
  expect(codexUrl.searchParams.get('endpoint')).toBe(
    `${window.location.origin}/v1`
  )
  await user.click(screen.getByRole('tab', { name: 'Claude' }))
  await waitFor(() =>
    expect(screen.getByLabelText(/Primary Model/)).toHaveValue('claude-sonnet')
  )
  await user.click(screen.getByRole('button', { name: 'Import to CC Switch' }))
  const claudeUrl = new URL(String(open.mock.calls[1][0]))
  expect(claudeUrl.searchParams.get('app')).toBe('claude')
  expect(claudeUrl.searchParams.get('model')).toBe('claude-sonnet')
  expect(claudeUrl.searchParams.get('endpoint')).toBe(window.location.origin)
})

test('disables import when no compatible model is available', async () => {
  mocks.getUserModels.mockResolvedValue({
    success: true,
    data: ['claude-sonnet'],
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ApplicationsConfiguration apiKey={apiKey} />
    </QueryClientProvider>
  )
  expect(await screen.findByText('No models found')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Import to CC Switch' })
  ).toBeDisabled()
})

test('switches between embedded Codex and Claude setup with the selected API key', async () => {
  mocks.getUserModels.mockResolvedValue({
    success: true,
    data: ['codex-model', 'claude-model'],
  })
  const user = userEvent.setup()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ApplicationsConfiguration apiKey={apiKey} />
    </QueryClientProvider>
  )
  expect(screen.getByRole('tab', { name: 'Codex' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  const codexManual = screen.getByRole('button', {
    name: 'Option 2: Configure manually',
  })
  expect(codexManual).toHaveAttribute('aria-expanded', 'false')
  expect(
    screen.queryByRole('radio', { name: 'CC Switch' })
  ).not.toBeInTheDocument()
  await user.click(codexManual)
  expect(codexManual).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('img')).toHaveLength(3)
  expect(screen.getByRole('radio', { name: 'CC Switch' })).toBeChecked()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'Command line' }))
  expect(
    await screen.findByText((text) => text.includes('model = "codex-model"'))
  ).toBeInTheDocument()
  expect(document.body).toHaveTextContent('sk-quick-start')
  await user.click(screen.getByRole('tab', { name: 'Claude' }))
  expect(screen.getByRole('tab', { name: 'Claude' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  const claudeManual = screen.getByRole('button', {
    name: 'Option 2: Configure manually',
  })
  expect(claudeManual).toHaveAttribute('aria-expanded', 'false')
  expect(
    screen.queryByRole('radio', { name: 'CC Switch' })
  ).not.toBeInTheDocument()
  claudeManual.focus()
  await user.keyboard('{Enter}')
  expect(claudeManual).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('radio', { name: 'CC Switch' })).toBeChecked()
  expect(screen.getAllByRole('img')).toHaveLength(3)
  expect(document.body).toHaveTextContent(
    'Quit Claude Desktop and Claude Code completely'
  )
  await user.click(screen.getByRole('radio', { name: 'Command line' }))
  expect(
    await screen.findByText((text) =>
      text.includes('"ANTHROPIC_MODEL": "claude-model"')
    )
  ).toBeInTheDocument()
  expect(document.body).toHaveTextContent('sk-quick-start')
})
