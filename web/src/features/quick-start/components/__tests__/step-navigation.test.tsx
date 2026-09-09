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

import { QuickStartStepNav } from '../quick-start-step-nav'

describe('quick start step navigation', () => {
  test('keeps the model step disabled until an API key has been created', () => {
    const onStepChange = vi.fn()
    render(
      <QuickStartStepNav
        activeStep='key'
        modelStepEnabled={false}
        onStepChange={onStepChange}
      />
    )

    const keyStep = screen.getByRole('button', { name: /Create API Key/ })
    const modelStep = screen.getByRole('button', {
      name: /Choose a model and make your first request/,
    })

    expect(keyStep).toHaveAttribute('aria-current', 'step')
    expect(modelStep).toBeDisabled()
    fireEvent.click(modelStep)
    expect(onStepChange).not.toHaveBeenCalled()
  })

  test('allows moving between both steps after an API key is available', () => {
    const onStepChange = vi.fn()
    render(
      <QuickStartStepNav
        activeStep='model'
        modelStepEnabled
        onStepChange={onStepChange}
      />
    )

    const keyStep = screen.getByRole('button', { name: /Create API Key/ })
    const modelStep = screen.getByRole('button', {
      name: /Choose a model and make your first request/,
    })

    expect(modelStep).toHaveAttribute('aria-current', 'step')
    fireEvent.click(keyStep)
    fireEvent.click(modelStep)
    expect(onStepChange).toHaveBeenNthCalledWith(1, 'key')
    expect(onStepChange).toHaveBeenNthCalledWith(2, 'model')
  })
})
