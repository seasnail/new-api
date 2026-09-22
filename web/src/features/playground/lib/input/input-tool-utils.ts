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
import type { PlaygroundConfig } from '../../types'
import { isImageGenerationModel } from '../streaming/images'
import { isResponsesEnabled } from '../streaming/responses'

export function isSearchEnabled(config: PlaygroundConfig): boolean {
  return (
    Boolean(config.webSearch) &&
    isResponsesEnabled(config) &&
    !isImageGenerationModel(config.model)
  )
}
