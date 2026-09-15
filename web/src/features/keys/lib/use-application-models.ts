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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getUserModels } from '@/lib/api'

import type { ApiKey } from '../types'

export function useApplicationModels(apiKey?: ApiKey, enabled = true) {
  const query = useQuery({
    queryKey: ['user-models-ccswitch', apiKey?.group],
    queryFn: async () => {
      const result = await getUserModels(apiKey?.group || undefined)
      if (!result.success) throw new Error(result.message)
      return result
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
  const modelsByApp = useMemo(() => {
    const allowed = apiKey?.model_limits_enabled
      ? new Set((apiKey.model_limits ?? '').split(',').filter(Boolean))
      : null
    const available = (query.data?.data ?? []).filter(
      (model) => !allowed || allowed.has(model)
    )
    return {
      claude: available.filter((model) => /(^|[/:])claude-/i.test(model)),
      codex: available.filter((model) => /(^|[/:])gpt-/i.test(model)),
      gemini: available.filter((model) => /(^|[/:])gemini-/i.test(model)),
    }
  }, [query.data?.data, apiKey?.model_limits_enabled, apiKey?.model_limits])
  return { modelsByApp, isLoading: query.isLoading, isError: query.isError }
}
