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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import {
  ModelPricingEditorPanel,
  type ModelPricingEditorPanelHandle,
  type ModelRatioData,
} from '../model-pricing-sheet'

const clients: QueryClient[] = []
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
})

function renderEditor(data: ModelRatioData) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['pricing'], { data: [], vendors: [] })
  client.setQueryData(['status'], {})
  const ref = createRef<ModelPricingEditorPanelHandle>()
  render(
    <QueryClientProvider client={client}>
      <ModelPricingEditorPanel ref={ref} editData={data} />
    </QueryClientProvider>
  )
  return ref
}

const model: ModelRatioData = {
  name: 'custom-model',
  ratio: '1.25',
  completionRatio: '4',
  cacheRatio: '0.5',
  createCacheRatio: '1.25',
  billingMode: 'per-token',
  completionMeta: { ratio: 4, default_ratio: 1, locked: false },
}

describe('primary token price editor', () => {
  test('exposes all four prices immediately and converts edited dollar amounts on commit', async () => {
    const ref = renderEditor(model)
    expect(screen.getByRole('textbox', { name: 'Input price' })).toHaveValue(
      '2.5'
    )
    expect(
      screen.getByRole('textbox', { name: 'Completion price' })
    ).toHaveValue('10')
    expect(
      screen.getByRole('textbox', { name: 'Cache read price' })
    ).toHaveValue('1.25')
    expect(
      screen.getByRole('textbox', { name: 'Cache write price' })
    ).toHaveValue('3.125')
    expect(
      screen.getByText('Advanced pricing').closest('details')
    ).not.toHaveAttribute('open')
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Completion price' }),
      { target: { value: '5' } }
    )
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Cache read price' }),
      { target: { value: '0' } }
    )
    let result: ModelRatioData | null = null
    await act(async () => {
      result = (await ref.current?.commitDraft()) ?? null
    })
    expect(result).toMatchObject({
      ratio: '1.25',
      completionRatio: '2',
      cacheRatio: '0',
      createCacheRatio: '1.25',
    })
  })
  test('clearing a cache override restores its effective default without saving zero', async () => {
    const ref = renderEditor(model)
    const cache = screen.getByRole('textbox', { name: 'Cache read price' })
    fireEvent.change(cache, { target: { value: '' } })
    expect(cache).toHaveAttribute('placeholder', '2.5')
    let result: ModelRatioData | null = null
    await act(async () => {
      result = (await ref.current?.commitDraft()) ?? null
    })
    expect(result).toMatchObject({ cacheRatio: '' })
  })
  test('shows the enforced output price and updates it when input changes', () => {
    renderEditor({
      ...model,
      completionRatio: '99',
      completionMeta: { ratio: 8, default_ratio: 8, locked: true },
    })
    const output = screen.getByRole('textbox', { name: 'Completion price' })
    expect(output).toBeDisabled()
    expect(output).toHaveValue('20')
    fireEvent.change(screen.getByRole('textbox', { name: 'Input price' }), {
      target: { value: '3' },
    })
    expect(output).toHaveValue('24')
  })
  test('rejects paid output with zero input instead of silently dropping its price', async () => {
    const ref = renderEditor(model)
    fireEvent.change(screen.getByRole('textbox', { name: 'Input price' }), {
      target: { value: '0' },
    })
    let result: ModelRatioData | null | undefined
    await act(async () => {
      result = await ref.current?.commitDraft()
    })
    expect(result).toBeNull()
    expect(
      screen.getByRole('textbox', { name: 'Input price' })
    ).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Use expression pricing'
      )
    )
  })
})
