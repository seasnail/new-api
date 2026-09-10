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
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { CodexConfiguration } from '../codex-configuration'

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { server_address: 'https://api.example.com/' },
  }),
}))

describe('Codex configuration instructions', () => {
  test('builds provider and Windows environment commands from the selected setup', () => {
    render(<CodexConfiguration apiKey='example-key' modelName='codex-model' />)

    expect(document.body).toHaveTextContent('model = "codex-model"')
    expect(document.body).toHaveTextContent(
      'base_url = "https://api.example.com/v1"'
    )
    expect(document.body).toHaveTextContent('env_key = "ONE_GATEWAY_KEY"')
    expect(document.body).toHaveTextContent('sk-example-key')
    expect(document.body).toHaveTextContent(
      '%USERPROFILE%\\.codex\\config.toml'
    )
    expect(document.body).toHaveTextContent(
      'Get-Process -Name "Codex" -ErrorAction SilentlyContinue | Stop-Process -Force'
    )
    expect(document.body).toHaveTextContent('New-Item -ItemType File')
    const stepNames = [
      '1. Close Codex',
      '2. Open the Codex config file',
      '3. Add the provider configuration',
      '4. Set the API key',
      '5. Restart Codex',
    ]
    for (const stepName of stepNames) {
      expect(
        screen.getByRole('heading', { name: stepName })
      ).toBeInTheDocument()
    }
  })

  test('shows the correct shell profile for macOS and Linux', () => {
    render(
      <CodexConfiguration apiKey='sk-example-key' modelName='codex-model' />
    )

    fireEvent.click(screen.getByRole('tab', { name: 'macOS' }))
    expect(document.body).toHaveTextContent('~/.zshrc')
    expect(document.body).toHaveTextContent(
      'mkdir -p ~/.codex && touch ~/.codex/config.toml'
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Linux' }))
    expect(document.body).toHaveTextContent('~/.bashrc')
    expect(document.body).toHaveTextContent(
      '${EDITOR:-nano} ~/.codex/config.toml'
    )
  })
})
