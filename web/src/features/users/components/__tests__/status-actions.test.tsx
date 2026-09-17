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
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { USER_ROLE, USER_STATUS } from '../../constants'
import type { User } from '../../types'
import { useUsersColumns } from '../users-columns'
import { UsersProvider } from '../users-provider'

const user: User = {
  id: 7,
  username: 'sample-user',
  display_name: 'Sample User',
  quota: 0,
  used_quota: 0,
  request_count: 0,
  group: 'default',
  status: USER_STATUS.ENABLED,
  role: USER_ROLE.USER,
}

function UserRow(props: { user: User }) {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
  })
  const columns = useUsersColumns()
  const table = useReactTable({
    data: [props.user],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <RouterContextProvider router={router}>
      <UsersProvider>
        {table
          .getRowModel()
          .rows[0].getVisibleCells()
          .filter((cell) =>
            ['username', 'status', 'actions'].includes(cell.column.id)
          )
          .map((cell) => (
            <div key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
      </UsersProvider>
    </RouterContextProvider>
  )
}

describe('user status actions', () => {
  test.each([
    [USER_STATUS.ENABLED, 'Disable', 'disable'],
    [USER_STATUS.DISABLED, 'Enable', 'enable'],
  ] as const)(
    'status %s exposes %s directly and submits the selected user',
    async (status, label, action) => {
      const post = vi
        .spyOn(api, 'post')
        .mockResolvedValue({ data: { success: true } })
      render(<UserRow user={{ ...user, status }} />)
      fireEvent.click(screen.getByRole('button', { name: label }))
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith('/api/user/manage', { id: 7, action })
      )
    }
  )

  test('root user cannot be disabled', () => {
    render(<UserRow user={{ ...user, role: USER_ROLE.ROOT }} />)
    expect(screen.getByRole('button', { name: 'Disable' })).toBeDisabled()
  })

  test('disabled user has red names and a red labeled status', () => {
    render(<UserRow user={{ ...user, status: USER_STATUS.DISABLED }} />)
    expect(screen.getByText('sample-user')).toHaveClass('text-destructive')
    expect(screen.getByText('Sample User')).toHaveClass('text-destructive')
    expect(
      screen.getByText('Disabled').closest('.text-destructive')
    ).not.toBeNull()
  })

  test('deleted user has no enable or disable action', () => {
    render(<UserRow user={{ ...user, DeletedAt: '2026-09-17' }} />)
    expect(
      screen.queryByRole('button', { name: 'Disable' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Enable' })
    ).not.toBeInTheDocument()
  })
})
