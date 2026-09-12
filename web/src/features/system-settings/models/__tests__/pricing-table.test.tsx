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
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { ModelRatioVisualEditor } from '../model-ratio-visual-editor'

const clients: QueryClient[] = []
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  localStorage.clear()
})
const saved = {
  ModelPrice: '{"image":0.04}',
  ModelRatio: '{"cheap":1,"expensive":5,"dynamic":2}',
  CompletionRatio: '{"cheap":2,"expensive":3}',
  CacheRatio: '{}',
  CreateCacheRatio: '{}',
  ImageRatio: '{}',
  AudioRatio: '{}',
  AudioCompletionRatio: '{}',
  'billing_setting.billing_mode': '{"dynamic":"tiered_expr"}',
  'billing_setting.billing_expr':
    '{"dynamic":"tier(\\"base\\", p * 4 + c * 12)"}',
}
function PricingSettingsFixture() {
  const [draft, setDraft] = useState<Record<string, string>>(saved)
  return (
    <ModelRatioVisualEditor
      savedModelPrice={saved.ModelPrice}
      savedModelRatio={saved.ModelRatio}
      savedCompletionRatio={saved.CompletionRatio}
      savedCacheRatio={saved.CacheRatio}
      savedCreateCacheRatio={saved.CreateCacheRatio}
      savedImageRatio={saved.ImageRatio}
      savedAudioRatio={saved.AudioRatio}
      savedAudioCompletionRatio={saved.AudioCompletionRatio}
      savedBillingMode={saved['billing_setting.billing_mode']}
      savedBillingExpr={saved['billing_setting.billing_expr']}
      modelPrice={draft.ModelPrice}
      modelRatio={draft.ModelRatio}
      completionRatio={draft.CompletionRatio}
      cacheRatio={draft.CacheRatio}
      createCacheRatio={draft.CreateCacheRatio}
      imageRatio={draft.ImageRatio}
      audioRatio={draft.AudioRatio}
      audioCompletionRatio={draft.AudioCompletionRatio}
      billingMode={draft['billing_setting.billing_mode']}
      billingExpr={draft['billing_setting.billing_expr']}
      onChange={(key, value) =>
        setDraft((previous) => ({ ...previous, [key]: value }))
      }
      onSave={() => undefined}
      isSaving={false}
    />
  )
}
function renderPricingSettings() {
  localStorage.clear()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['pricing'], { data: [], vendors: [] })
  client.setQueryData(['status'], {})
  client.setQueryData(['system-options'], {
    data: [
      {
        key: 'CompletionRatioMeta',
        value:
          '{"cheap":{"ratio":2,"default_ratio":1,"locked":false},"expensive":{"ratio":3,"default_ratio":1,"locked":false}}',
      },
    ],
  })
  render(
    <QueryClientProvider client={client}>
      <PricingSettingsFixture />
    </QueryClientProvider>
  )
}

describe('unified pricing table', () => {
  test('shows four dollar-price columns and separates per-request and variable prices', () => {
    renderPricingSettings()
    expect(
      screen.queryByRole('columnheader', { name: 'Price summary' })
    ).not.toBeInTheDocument()
    for (const label of [
      'Input price',
      'Completion price',
      'Cache read price',
      'Cache write price',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: `${label} ($/1M)` })
      ).toBeVisible()
    }
    const cheap = screen.getByRole('row', { name: /Select row cheap / })
    expect(within(cheap).getByText('$4')).toBeVisible()
    expect(within(cheap).getByText('$2.5')).toBeVisible()
    const dynamic = screen.getByRole('row', { name: /Select row dynamic/ })
    expect(within(dynamic).getAllByText('Variable')).toHaveLength(4)
    const image = screen.getByRole('row', { name: /Select row image/ })
    expect(within(image).getByText('Per-request')).toBeVisible()
    expect(within(image).getAllByText('—')).toHaveLength(4)
  })
  test('sorts prices numerically and keeps unset prices last', async () => {
    renderPricingSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Input price ($/1M)' }))
    await user.click(screen.getByRole('menuitem', { name: 'Desc' }))
    const dataRows = screen
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('cell').length > 0)
    expect(dataRows[0]).toHaveTextContent('expensive')
    expect(dataRows[1]).toHaveTextContent('cheap')
  })
  test('opens the editor on desktop and retains valid draft prices when closed', async () => {
    renderPricingSettings()
    const user = userEvent.setup()
    await user.click(screen.getByText('cheap'))
    expect(
      screen.getByRole('dialog', { name: 'Edit model pricing' })
    ).toBeVisible()
    fireEvent.change(screen.getByRole('textbox', { name: 'Input price' }), {
      target: { value: '4' },
    })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    const cheap = screen.getByRole('row', { name: /Select row cheap / })
    expect(within(cheap).getAllByText('$4').length).toBeGreaterThan(0)
    await user.click(screen.getByText('cheap'))
    expect(screen.getByRole('textbox', { name: 'Input price' })).toHaveValue(
      '4'
    )
  })
})
