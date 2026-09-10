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

import {
  convertDetectedLanguage,
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '../languages'

describe('interface languages', () => {
  test('only exposes the supported language choices', () => {
    expect(INTERFACE_LANGUAGE_OPTIONS.map((language) => language.code)).toEqual(
      ['zhCN', 'en', 'fr', 'ru']
    )
  })

  test('falls back to English for removed languages', () => {
    expect(normalizeInterfaceLanguage('ja')).toBe('en')
    expect(normalizeInterfaceLanguage('vi')).toBe('en')
  })

  test('uses simplified Chinese for detected Chinese variants', () => {
    expect(normalizeInterfaceLanguage('zh-TW')).toBe('zhCN')
    expect(convertDetectedLanguage('zh-Hant')).toBe('zhCN')
  })
})
