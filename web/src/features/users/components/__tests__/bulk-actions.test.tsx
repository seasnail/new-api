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
import {
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { DataTableToolbar } from '@/components/data-table/toolbar/toolbar'
import { api } from '@/lib/api'

import type { User } from '../../types'
import { DataTableBulkActions } from '../data-table-bulk-actions'
import { UsersProvider } from '../users-provider'

const users: User[] = [7, 8].map((id) => ({
  id,
  username: `user-${id}`,
  display_name: '',
  role: 1,
  status: 1,
  quota: 0,
  used_quota: 0,
  request_count: 0,
  group: 'default',
}))

function BulkUsers() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({
    '7': true,
    '8': true,
  })
  const table = useReactTable({
    data: users,
    columns: [],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (user) => String(user.id),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  })
  return (
    <UsersProvider>
      <output aria-label='Selection'>
        {Object.keys(table.getState().rowSelection).join(',')}
      </output>
      <DataTableToolbar
        table={table}
        preActions={<DataTableBulkActions table={table} />}
      />
    </UsersProvider>
  )
}

describe('bulk user actions', () => {
  test('selected user actions appear inline beside View and clear with selection', () => {
    render(<BulkUsers />)
    const toolbar = screen.getByRole('toolbar')
    expect(toolbar).not.toHaveClass('fixed')
    expect(
      screen.getByRole('button', { name: 'View' }).parentElement
    ).toContainElement(toolbar)
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
  })
  test('disable requires confirmation and processes every selected user', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { success: true } })
    render(<BulkUsers />)
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('user-7 (#7)')).toBeInTheDocument()
    expect(within(dialog).getByText('user-8 (#8)')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable' }))
    await waitFor(() =>
      expect(within(dialog).getAllByText(/Success/)).toHaveLength(2)
    )
    expect(post).toHaveBeenNthCalledWith(1, '/api/user/manage', {
      id: 7,
      action: 'disable',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/user/manage', {
      id: 8,
      action: 'disable',
    })
    expect(screen.getByLabelText('Selection')).toBeEmptyDOMElement()
  })

  test('canceling permanent deletion sends no request', () => {
    const remove = vi.spyOn(api, 'delete')
    render(<BulkUsers />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Cancel',
      })
    )
    expect(remove).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Selection')).toHaveTextContent('7,8')
  })

  test('delete reports partial failure and retains only failed selections', async () => {
    const remove = vi
      .spyOn(api, 'delete')
      .mockResolvedValueOnce({
        data: { success: false, message: 'Permission denied' },
      })
      .mockResolvedValueOnce({ data: { success: true } })
    render(<BulkUsers />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(
        within(dialog).getByText('user-7 (#7): Failed: Permission denied')
      ).toBeInTheDocument()
    )
    expect(within(dialog).getByText('user-8 (#8): Success')).toBeInTheDocument()
    expect(remove).toHaveBeenNthCalledWith(1, '/api/user/7/')
    expect(remove).toHaveBeenNthCalledWith(2, '/api/user/8/')
    expect(screen.getByLabelText('Selection')).toHaveTextContent(/^7$/)
  })

  test('network failure continues with the next user', async () => {
    vi.spyOn(api, 'post')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { success: true } })
    render(<BulkUsers />)
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable' }))
    await waitFor(() =>
      expect(
        within(dialog).getByText('user-8 (#8): Success')
      ).toBeInTheDocument()
    )
    expect(within(dialog).getByText(/user-7.*Failed/)).toBeInTheDocument()
    expect(screen.getByLabelText('Selection')).toHaveTextContent(/^7$/)
  })
})
