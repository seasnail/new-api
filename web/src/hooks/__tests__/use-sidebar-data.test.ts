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
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useSidebarData } from '../use-sidebar-data'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('general sidebar navigation', () => {
  it('links the Models item to the Console model list', () => {
    const { result } = renderHook(() => useSidebarData())
    const generalGroup = result.current.navGroups.find(
      (group) => group.id === 'general'
    )
    const modelsItem = generalGroup?.items.find(
      (item) => item.title === 'Models'
    )

    expect(modelsItem).toMatchObject({ url: '/pricing' })
  })
})
