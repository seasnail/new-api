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
import { ClaudeConfigDrawer } from '../dialogs/claude-config-drawer'

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

describe('Claude config drawer', () => {
  test.each([
    {
      response: { success: true, data: ['claude-blocked', 'claude-allowed'] },
      expected: '"ANTHROPIC_MODEL": "claude-allowed"',
    },
    {
      response: { success: true, data: ['claude-blocked'] },
      expected: 'No models are available for this API key.',
    },
    {
      response: { success: false, message: 'Unavailable' },
      expected: 'Failed to fetch models',
    },
  ])(
    'command-line setup handles restricted or unavailable models: $expected',
    async ({ response, expected }) => {
      mocks.getUserModels.mockResolvedValue(response)
      const user = userEvent.setup()
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      render(
        <QueryClientProvider client={queryClient}>
          <ClaudeConfigDrawer
            open
            onOpenChange={vi.fn()}
            apiKey={{
              ...apiKey,
              model_limits_enabled: true,
              model_limits: 'claude-allowed',
            }}
            tokenKey='sk-test'
          />
        </QueryClientProvider>
      )
      await user.click(screen.getByRole('radio', { name: 'Command line' }))
      expect(
        await screen.findByText((content) => content.includes(expected))
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('option', { name: 'claude-blocked' })
      ).not.toBeInTheDocument()
    }
  )

  test('defaults to CC Switch setup images', async () => {
    mocks.getUserModels.mockResolvedValue({
      success: true,
      data: ['general-model', 'gpt-5.3-claude'],
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ClaudeConfigDrawer
          open
          onOpenChange={vi.fn()}
          apiKey={apiKey}
          tokenKey='sk-full-key'
        />
      </QueryClientProvider>
    )

    expect(await screen.findByText('Configure Claude')).toBeInTheDocument()
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
      'Quit Claude Desktop and Claude Code completely before editing the provider configuration.'
    )
    expect(document.body).toHaveTextContent(
      'In CC Switch, select Claude Code or Claude Desktop, then click the plus button to add a provider.'
    )
    expect(document.body).toHaveTextContent(
      'Enter the provider name, website URL, API key, and API endpoint.'
    )
    expect(document.body).toHaveTextContent(
      'Find the new provider in the Claude list and click Enable.'
    )
    expect(document.body).toHaveTextContent(
      'Restart Claude Desktop and Claude Code after completing these steps.'
    )
  })

  test('switches from CC Switch setup images to command-line instructions', async () => {
    mocks.getUserModels.mockResolvedValue({
      success: true,
      data: ['claude-model'],
    })
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <ClaudeConfigDrawer
          open
          onOpenChange={vi.fn()}
          apiKey={apiKey}
          tokenKey='sk-test'
        />
      </QueryClientProvider>
    )

    await user.click(screen.getByRole('radio', { name: 'Command line' }))
    expect(
      await screen.findByRole('tab', { name: 'Windows' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.body).toHaveTextContent('"ANTHROPIC_MODEL": "claude-model"')
    expect(document.body).toHaveTextContent(
      '"ANTHROPIC_BASE_URL": "https://api.example.com"'
    )
    expect(document.body).toHaveTextContent('"ANTHROPIC_AUTH_TOKEN": "sk-test"')
    expect(document.body).not.toHaveTextContent('https://api.example.com/v1')
    await user.click(screen.getByRole('tab', { name: 'macOS' }))
    expect(document.body).toHaveTextContent('open -e ~/.claude/settings.json')
    await user.click(screen.getByRole('tab', { name: 'Linux' }))
    expect(document.body).toHaveTextContent(
      '${EDITOR:-nano} ~/.claude/settings.json'
    )

    await user.click(screen.getByRole('radio', { name: 'CC Switch' }))
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 1' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'CC Switch setup step 3' })
    ).toBeInTheDocument()
  })
})
