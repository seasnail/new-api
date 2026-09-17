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
import { describe, expect, test, vi } from 'vitest'

import { PasswordInput } from '../../password-input'

describe('password visibility', () => {
  test('keeps the toggle centered while pressed so its click target does not move', () => {
    render(<PasswordInput aria-label='Password' />)

    const toggle = screen.getByRole('button', {
      name: 'Toggle password visibility',
    })
    expect(toggle).toHaveClass('-translate-y-1/2')
    expect(toggle).toHaveClass('active:not-aria-[haspopup]:-translate-y-1/2')
    expect(toggle).not.toHaveClass('active:not-aria-[haspopup]:translate-y-px')
  })

  test('clicking shows and hides the existing password without submitting the form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label='Password' defaultValue='example-password' />
      </form>
    )
    const input = screen.getByLabelText('Password')
    const toggle = screen.getByRole('button', {
      name: 'Toggle password visibility',
    })

    await user.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('example-password')
    await user.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue('example-password')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('keyboard activation shows and hides the password', async () => {
    const user = userEvent.setup()
    render(
      <PasswordInput aria-label='Password' defaultValue='example-password' />
    )
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.keyboard(' ')
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password'
    )
  })

  test('a disabled password cannot be revealed by clicking the toggle', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label='Password' disabled />)

    const toggle = screen.getByRole('button')
    expect(toggle).toBeDisabled()
    await user.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password'
    )
  })
})
