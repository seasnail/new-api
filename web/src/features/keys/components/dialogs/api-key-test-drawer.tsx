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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  sideDrawerContentClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ModelDetailsApi } from '@/features/pricing/components/model-details-api'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { getUserModels } from '@/lib/api'

import type { ApiKey } from '../../types'

type ApiKeyTestDrawerProps = {
  apiKey: ApiKey
  tokenKey: string
  onOpenChange: (open: boolean) => void
}

export function ApiKeyTestDrawer(props: ApiKeyTestDrawerProps) {
  const { t } = useTranslation()
  const [selectedModelName, setSelectedModelName] = useState('')
  const pricing = usePricingData()
  const modelsQuery = useQuery({
    queryKey: ['api-key-test', 'models', props.apiKey.group],
    queryFn: async () => {
      const result = await getUserModels(props.apiKey.group || undefined)
      if (!result.success) throw new Error(result.message)
      return result.data ?? []
    },
  })
  const availableModels = useMemo(() => {
    const names = new Set(modelsQuery.data ?? [])
    const limits = props.apiKey.model_limits_enabled
      ? new Set((props.apiKey.model_limits ?? '').split(',').filter(Boolean))
      : null
    return pricing.models.filter(
      (model) =>
        names.has(model.model_name) && (!limits || limits.has(model.model_name))
    )
  }, [modelsQuery.data, pricing.models, props.apiKey])
  const selectedModel =
    availableModels.find((model) => model.model_name === selectedModelName) ??
    availableModels[0]
  const modelItems = availableModels.map((model) => ({
    label: model.model_name,
    value: model.model_name,
  }))

  let content
  if (modelsQuery.isLoading || pricing.isLoading) {
    content = <p role='status'>{t('Loading...')}</p>
  } else if (modelsQuery.isError || pricing.error) {
    content = (
      <Alert variant='destructive'>
        <AlertTitle>{t('Failed to fetch models')}</AlertTitle>
        <AlertDescription>
          {t('Please refresh the page and try again.')}
        </AlertDescription>
      </Alert>
    )
  } else if (!selectedModel) {
    content = <p>{t('No models are available for this API key.')}</p>
  } else {
    content = (
      <>
        <div className='space-y-2'>
          <label htmlFor='api-key-test-model' className='text-sm font-medium'>
            {t('Available models')}
          </label>
          <Select
            items={modelItems}
            value={selectedModel.model_name}
            onValueChange={(value) => setSelectedModelName(value ?? '')}
          >
            <SelectTrigger id='api-key-test-model' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {availableModels.map((model) => (
                <SelectItem key={model.model_name} value={model.model_name}>
                  {model.model_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ModelDetailsApi
          key={selectedModel.model_name}
          model={selectedModel}
          apiKey={props.tokenKey}
          endpointMap={
            pricing.endpointMap as Record<
              string,
              { path?: string; method?: string }
            >
          }
        />
      </>
    )
  }

  return (
    <Sheet open onOpenChange={props.onOpenChange}>
      <SheetContent
        className={sideDrawerContentClassName('max-w-none sm:!max-w-[800px]')}
      >
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Test')}</SheetTitle>
          <SheetDescription>
            {t('API request example')} — {props.apiKey.name}
          </SheetDescription>
        </SheetHeader>
        <div className={sideDrawerFormClassName('gap-4')}>{content}</div>
      </SheetContent>
    </Sheet>
  )
}
