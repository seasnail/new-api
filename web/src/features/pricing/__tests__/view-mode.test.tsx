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
import { useSearch } from '@tanstack/react-router'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { VIEW_MODES } from '../constants'
import { useFilters } from '../hooks/use-filters'

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(),
}))

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: <T,>(value: T) => value,
}))

const mockedUseSearch = vi.mocked(useSearch)

describe('pricing view mode', () => {
  beforeEach(() => {
    mockedUseSearch.mockReturnValue({} as ReturnType<typeof useSearch>)
  })

  it('uses table view when the URL does not specify a view', () => {
    const { result } = renderHook(() => useFilters([]))

    expect(result.current.viewMode).toBe(VIEW_MODES.TABLE)
  })

  it('preserves an explicit card view and can return to the table default', () => {
    mockedUseSearch.mockReturnValue({
      view: VIEW_MODES.CARD,
    } as ReturnType<typeof useSearch>)
    const { result } = renderHook(() => useFilters([]))

    expect(result.current.viewMode).toBe(VIEW_MODES.CARD)

    act(() => result.current.setViewMode(VIEW_MODES.TABLE))

    expect(result.current.viewMode).toBe(VIEW_MODES.TABLE)
  })
})
