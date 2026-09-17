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
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import type { User } from '../../types'
import { useUsersColumns } from '../users-columns'

const user: User = {
  id: 7,
  username: 'selected-user',
  display_name: 'Selected User',
  quota: 0,
  used_quota: 0,
  request_count: 0,
  group: 'default',
  status: 1,
  role: 1,
}

function UserName() {
  const table = useReactTable({
    data: [user],
    columns: useUsersColumns(),
    getCoreRowModel: getCoreRowModel(),
  })
  const cell = table
    .getRowModel()
    .rows[0].getVisibleCells()
    .find((cell) => cell.column.id === 'username')
  if (!cell) throw new Error('Username column is missing')
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
}

test.each(['click', 'keyboard'] as const)(
  'activating a username by %s opens API usage filtered to that username',
  async (interaction) => {
    const root = createRootRoute()
    const users = createRoute({
      getParentRoute: () => root,
      path: '/users',
      component: UserName,
    })
    const usage = createRoute({
      getParentRoute: () => root,
      path: '/usage-logs/$section',
      component: () => <div>API usage</div>,
    })
    const router = createRouter({
      routeTree: root.addChildren([users, usage]),
      history: createMemoryHistory({ initialEntries: ['/users?page=3'] }),
    })
    const actor = userEvent.setup()
    render(<RouterProvider router={router} />)
    const link = await screen.findByRole('link', { name: user.username })
    if (interaction === 'keyboard') {
      await actor.tab()
      expect(link).toHaveFocus()
      await actor.keyboard('{Enter}')
    } else {
      await actor.click(link)
    }
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/usage-logs/common')
    )
    expect(router.state.location.search).toEqual({ username: user.username })
    expect(await screen.findByText('API usage')).toBeInTheDocument()
  }
)
