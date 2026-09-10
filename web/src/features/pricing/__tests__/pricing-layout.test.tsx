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
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Pricing } from '../index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count == null
        ? key
        : key.replace('{{count}}', `${options.count}`),
  }),
}))

vi.mock('@/components/layout', () => ({
  SectionPageLayout: Object.assign(
    (props: PropsWithChildren) => <section>{props.children}</section>,
    {
      Title: (props: PropsWithChildren) => <h2>{props.children}</h2>,
      Content: (props: PropsWithChildren) => <div>{props.children}</div>,
    }
  ),
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: (props: PropsWithChildren<{ className?: string }>) => (
    <div className={props.className}>{props.children}</div>
  ),
}))

vi.mock('../components', () => ({
  LoadingSkeleton: () => <div data-testid='loading' />,
  EmptyState: () => <div data-testid='empty' />,
  SearchBar: () => <div data-testid='search' />,
  PricingSidebar: (props: { layout?: string }) => (
    <div data-layout={props.layout} data-testid='filters' />
  ),
  PricingToolbar: (props: { showFilterButton?: boolean }) => (
    <div
      data-show-filter-button={`${props.showFilterButton}`}
      data-testid='toolbar'
    />
  ),
  ModelCardGrid: () => <div data-testid='card-list' />,
  PricingTable: () => <div data-testid='model-list' />,
  ModelDetailsDrawer: () => null,
}))

vi.mock('../hooks/use-pricing-data', () => ({
  usePricingData: () => ({
    models: [{ model_name: 'gpt-test' }],
    vendors: [],
    groupRatio: {},
    usableGroup: {},
    endpointMap: {},
    autoGroups: [],
    isLoading: false,
    priceRate: 1,
    usdExchangeRate: 1,
  }),
}))

vi.mock('../hooks/use-filters', () => ({
  useFilters: (models: unknown[]) => ({
    searchInput: '',
    sortBy: 'name',
    vendorFilter: 'all',
    groupFilter: 'all',
    quotaTypeFilter: 'all',
    endpointTypeFilter: 'all',
    tagFilter: 'all',
    tokenUnit: 'M',
    viewMode: 'table',
    showRechargePrice: false,
    setSearchInput: vi.fn(),
    setSortBy: vi.fn(),
    setVendorFilter: vi.fn(),
    setGroupFilter: vi.fn(),
    setQuotaTypeFilter: vi.fn(),
    setEndpointTypeFilter: vi.fn(),
    setTagFilter: vi.fn(),
    setTokenUnit: vi.fn(),
    setViewMode: vi.fn(),
    setShowRechargePrice: vi.fn(),
    filteredModels: models,
    hasActiveFilters: false,
    activeFilterCount: 0,
    availableTags: [],
    clearFilters: vi.fn(),
    clearSearch: vi.fn(),
  }),
}))

describe('model list layout', () => {
  it('shows the Model List title and places the top filters before the table', () => {
    render(<Pricing />)

    expect(
      screen.getByRole('heading', { name: 'Model List' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('filters')).toHaveAttribute('data-layout', 'top')
    expect(screen.getByTestId('toolbar')).toHaveAttribute(
      'data-show-filter-button',
      'false'
    )

    const filters = screen.getByTestId('filters')
    const modelList = screen.getByTestId('model-list')
    expect(
      filters.compareDocumentPosition(modelList) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
