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
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey.includes('api-keys') ? [] : ['gpt-4o-mini'],
    isFetched: true,
  })),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: ComponentProps<'a'>) => <a {...props} />,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: { role: 1, request_count: 0, quota: 0, used_quota: 0 },
      },
    }),
}))

vi.mock('../../../hooks/use-status-data', () => ({
  useApiInfo: () => ({ items: [] }),
  useDashboardContentVisibility: () => ({
    apiInfo: true,
    announcements: true,
    faq: true,
    uptimeKuma: true,
  }),
}))

vi.mock('../summary-cards', () => ({
  SummaryCards: () => <section>Usage at a glance</section>,
}))
vi.mock('../api-info-panel', () => ({
  ApiInfoPanel: () => <section>API information panel</section>,
}))
vi.mock('../announcements-panel', () => ({
  AnnouncementsPanel: () => <section>Announcements panel</section>,
}))
vi.mock('../faq-panel', () => ({
  FAQPanel: () => <section>FAQ panel</section>,
}))
vi.mock('../performance-health-panel', () => ({
  PerformanceHealthPanel: () => <section>Performance panel</section>,
}))
vi.mock('../uptime-panel', () => ({
  UptimePanel: () => <section>Uptime panel</section>,
}))

const { DashboardOverviewPanels, OverviewDashboard } =
  await import('../overview-dashboard')

describe('dashboard overview layout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('quick start keeps only onboarding and recommended actions', () => {
    render(<OverviewDashboard />)

    expect(screen.getByText('Get started')).toBeInTheDocument()
    expect(screen.getByText('Recommended actions')).toBeInTheDocument()
    expect(screen.queryByText('Usage at a glance')).not.toBeInTheDocument()
    expect(screen.queryByText('API information panel')).not.toBeInTheDocument()
  })

  test('dashboard contains usage and the supporting overview panels', () => {
    render(<DashboardOverviewPanels />)

    expect(screen.getByText('Usage at a glance')).toBeInTheDocument()
    expect(screen.getByText('API information panel')).toBeInTheDocument()
    expect(screen.getByText('Announcements panel')).toBeInTheDocument()
    expect(screen.getByText('FAQ panel')).toBeInTheDocument()
    expect(screen.getByText('Uptime panel')).toBeInTheDocument()
  })
})
