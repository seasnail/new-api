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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { PlaygroundInput } from '../playground-input'
import { PlaygroundInputControls } from '../playground-input-controls'

describe('Playground model selection', () => {
  test('image hint opens on click and keyboard, closes on Escape, and restores parameters when switching back', async () => {
    const user = userEvent.setup()
    const config = { ...DEFAULT_CONFIG, model: 'gpt-image-2.5-sunburst' }
    const props = {
      config,
      modelValue: config.model,
      models: [
        { label: config.model, value: config.model },
        { label: 'gpt-5.6-luna', value: 'gpt-5.6-luna' },
      ],
      onModelChange: vi.fn(),
      onSubmit: vi.fn(),
      onConfigChange: vi.fn(),
      onParameterEnabledChange: vi.fn(),
      parameterEnabled: DEFAULT_PARAMETER_ENABLED,
    }
    const { rerender } = render(<PlaygroundInput {...props} />)
    expect(
      screen.getByText(
        'Image generation uses your latest prompt only. Chat history and chat parameters are not sent.'
      )
    ).toBeVisible()
    expect(
      screen.queryByText(/To use chat history and supported parameters/)
    ).not.toBeInTheDocument()
    const hint = screen.getByRole('button', { name: 'Image generation' })
    expect(hint.textContent).toBe('')
    expect(hint).toHaveAttribute('aria-expanded', 'false')
    await user.click(hint)
    expect(screen.getByRole('dialog', { name: 'Image generation' })).toBeVisible()
    expect(
      within(screen.getByRole('dialog')).getByText(
        /To use chat history and supported parameters/
      )
    ).toBeVisible()
    expect(
      within(screen.getByRole('dialog')).queryByText(
        /Image generation uses your latest prompt only/
      )
    ).not.toBeInTheDocument()
    expect(hint).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hint).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Image generation' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Parameters' })
    ).not.toBeInTheDocument()
    rerender(
      <PlaygroundInput
        {...props}
        config={{ ...config, model: 'gpt-5.6-luna' }}
        modelValue='gpt-5.6-luna'
      />
    )
    expect(screen.getByRole('button', { name: 'Parameters' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Parameters' }).textContent).toBe('')
    expect(
      screen.queryByRole('button', { name: 'Image generation' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Image generation uses your latest prompt only/)
    ).not.toBeInTheDocument()
  })
  test('shows model options without a model-group chooser', async () => {
    const user = userEvent.setup()

    render(
      <PlaygroundInputControls
        models={[
          { label: 'gpt-4o', value: 'gpt-4o' },
          { label: 'claude-sonnet', value: 'claude-sonnet' },
        ]}
        modelValue='gpt-4o'
        onModelChange={vi.fn()}
        text='Hello'
        tools={null}
      />
    )

    await user.click(screen.getAllByRole('combobox')[0])

    expect(screen.getByText('claude-sonnet')).toBeVisible()
    expect(screen.queryByText('Model Group')).not.toBeInTheDocument()
  })
})
