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
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { getUserModels } from '../../api'
import { DEFAULT_GROUP } from '../../constants'
import { usePlaygroundOptions } from '../use-playground-options'

vi.mock('../../api', () => ({
  getUserModels: vi.fn(),
}))

describe('usePlaygroundOptions', () => {
  test('loads every model available to the default group', async () => {
    const models = [
      { label: 'gpt-4o', value: 'gpt-4o' },
      { label: 'claude-sonnet', value: 'claude-sonnet' },
    ]
    vi.mocked(getUserModels).mockResolvedValue(models)
    const setModels = vi.fn()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    renderHook(
      () =>
        usePlaygroundOptions({
          currentModel: 'gpt-4o',
          setModels,
          updateConfig: vi.fn(),
        }),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    )

    await waitFor(() => expect(setModels).toHaveBeenCalledWith(models))
    expect(getUserModels).toHaveBeenCalledWith(DEFAULT_GROUP)
  })
})
