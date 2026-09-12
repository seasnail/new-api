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
import { describe, expect, test } from 'vitest'

import { createModelPricingSchema } from '../model-pricing-core'
import {
  getTokenPrices,
  type ModelPricingSnapshot,
} from '../model-pricing-snapshots'

const model: ModelPricingSnapshot = {
  name: 'gpt-4o',
  ratio: '1.25',
  billingMode: 'per-token',
  hasConflict: false,
  completionMeta: { ratio: 4, default_ratio: 4, locked: false },
}

describe('unified model prices', () => {
  test('converts legacy input, output and cache ratios to dollars per million tokens', () => {
    expect(
      getTokenPrices({ ...model, cacheRatio: '0.5', createCacheRatio: '1.25' })
    ).toEqual({ input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 3.125 })
  })
  test('shows effective defaults when optional ratios are absent', () => {
    expect(getTokenPrices(model)).toEqual({
      input: 2.5,
      output: 10,
      cacheRead: 2.5,
      cacheWrite: 3.125,
    })
  })
  test('uses the enforced output multiplier even when stored output differs', () => {
    expect(
      getTokenPrices({
        ...model,
        completionRatio: '99',
        completionMeta: { ratio: 8, default_ratio: 8, locked: true },
      }).output
    ).toBe(20)
  })
  test('honors editable output overrides and restores the default when removed', () => {
    const overridden = {
      ...model,
      completionMeta: { ratio: 7, default_ratio: 4, locked: false },
    }
    expect(getTokenPrices({ ...overridden, completionRatio: '7' }).output).toBe(
      17.5
    )
    expect(getTokenPrices({ ...overridden, completionRatio: '' }).output).toBe(
      10
    )
  })
  test('preserves explicitly free prices without treating missing prices as free', () => {
    expect(
      getTokenPrices({
        ...model,
        ratio: '0',
        cacheRatio: '0',
        createCacheRatio: '0',
      })
    ).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
    expect(getTokenPrices({ ...model, ratio: '' })).toEqual({
      input: null,
      output: null,
      cacheRead: null,
      cacheWrite: null,
    })
    expect(
      getTokenPrices({ ...model, completionMeta: undefined }).output
    ).toBeNull()
  })
  test.each(['per-request', 'tiered_expr'])(
    'does not present %s rates as fixed token prices',
    (billingMode) => {
      expect(getTokenPrices({ ...model, billingMode, price: '0.04' })).toEqual({
        input: null,
        output: null,
        cacheRead: null,
        cacheWrite: null,
      })
    }
  )
  test.each(['-1', 'NaN', 'Infinity', '.', ' '])(
    'rejects invalid price %s before serialization',
    (price) => {
      expect(
        createModelPricingSchema((key) => key).safeParse({
          name: 'custom',
          price,
        }).success
      ).toBe(false)
    }
  )
  test('accepts explicit zero and blank optional prices', () => {
    expect(
      createModelPricingSchema((key) => key).safeParse({
        name: 'custom',
        ratio: '0',
        completionRatio: '',
      }).success
    ).toBe(true)
  })
})
