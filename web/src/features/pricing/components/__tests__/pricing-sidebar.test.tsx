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
import { describe, expect, it, vi } from 'vitest'

import { PricingSidebar } from '../pricing-sidebar'
import type { PricingModel } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

describe('pricing sidebar', () => {
  it('shows model filters without a Groups filter', () => {
    const model: PricingModel = {
      id: 1,
      model_name: 'gpt-test',
      vendor_name: 'OpenAI',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['default'],
      tags: 'chat',
      supported_endpoint_types: ['openai'],
    }

    render(
      <PricingSidebar
        quotaTypeFilter='all'
        endpointTypeFilter='all'
        vendorFilter='all'
        tagFilter='all'
        onQuotaTypeChange={vi.fn()}
        onEndpointTypeChange={vi.fn()}
        onVendorChange={vi.fn()}
        onTagChange={vi.fn()}
        vendors={[
          { id: 1, name: 'OpenAI' },
          { id: 2, name: 'Unused vendor' },
        ]}
        tags={['chat', 'unused']}
        models={[model]}
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
      />
    )

    expect(screen.queryByText('Groups')).not.toBeInTheDocument()
    expect(screen.getAllByText('All Vendors').length).toBeGreaterThan(0)
    expect(screen.getByText('Pricing Type')).toBeInTheDocument()
    expect(screen.getByText('Token-based')).toBeInTheDocument()
    expect(screen.queryByText('Per Request')).not.toBeInTheDocument()
    expect(screen.queryByText('Task billing')).not.toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.queryByText('Response')).not.toBeInTheDocument()
    expect(screen.queryByText('Unused vendor')).not.toBeInTheDocument()
    expect(screen.queryByText('unused')).not.toBeInTheDocument()
  })
})
