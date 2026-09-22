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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'

import { DEFAULT_CONFIG } from '../../../constants'
import { PlaygroundResponsesSettings } from '../playground-responses-settings'

function Settings() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  return (
    <PlaygroundResponsesSettings
      config={config}
      onConfigChange={(key, value) =>
        setConfig((previous) => ({ ...previous, [key]: value }))
      }
    />
  )
}

describe('Responses settings', () => {
  test('allows switching to Responses with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.tab()
    await user.keyboard(' ')
    expect(
      screen.getByRole('switch', { name: 'Use Responses API' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      screen.getByRole('switch', { name: 'Image generation' })
    ).toBeVisible()
  })
  test('enables Responses, exposes image settings, and retains the image model when toggled', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    expect(
      screen.queryByRole('switch', { name: 'Image generation' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Use Responses API' }))
    await user.click(screen.getByRole('switch', { name: 'Image generation' }))
    await user.type(
      screen.getByRole('combobox', { name: 'Image model' }),
      'gpt-image-2.5-sunburst'
    )
    expect(
      screen.getByText(
        'Generated images are available until you refresh. Download them to keep a copy.'
      )
    ).toBeVisible()
    await user.click(screen.getByRole('switch', { name: 'Use Responses API' }))
    expect(
      screen.queryByRole('combobox', { name: 'Image model' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Use Responses API' }))
    expect(screen.getByRole('combobox', { name: 'Image model' })).toHaveValue(
      'gpt-image-2.5-sunburst'
    )
  })

  test('disables settings during generation', () => {
    render(
      <PlaygroundResponsesSettings
        config={{
          ...DEFAULT_CONFIG,
          apiMode: 'responses',
          imageGeneration: true,
        }}
        disabled
        onConfigChange={() => undefined}
      />
    )
    expect(
      screen.getByRole('switch', { name: 'Use Responses API' })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('switch', { name: 'Image generation' })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('combobox', { name: 'Image model' })).toBeDisabled()
  })
})
