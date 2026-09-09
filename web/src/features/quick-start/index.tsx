import { Key01Icon, SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
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
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Main } from '@/components/layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiKey } from '@/features/keys/api'
import { ApiKeysMutateDrawer } from '@/features/keys/components/api-keys-mutate-drawer'
import { ApiKeysProvider } from '@/features/keys/components/api-keys-provider'
import type { ApiKey } from '@/features/keys/types'
import { ModelDetailsApi } from '@/features/pricing/components/model-details-api'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { getUserModels } from '@/lib/api'

import { CodexConfiguration } from './components/codex-configuration'
import {
  QuickStartStepNav,
  type QuickStartStep,
} from './components/quick-start-step-nav'

type QuickStartProps = {
  step: QuickStartStep
  tokenId?: number
  onStepChange: (step: QuickStartStep) => void
  onTokenCreated: (tokenId: number) => void
  onFinish: () => void
}

export function QuickStart(props: QuickStartProps) {
  const { t } = useTranslation()
  const [selectedModelName, setSelectedModelName] = useState('')
  const configuredStepActive =
    props.step !== 'key' && props.tokenId !== undefined
  const codexStepActive = props.step === 'codex' && configuredStepActive

  const apiKeyQuery = useQuery({
    queryKey: ['quick-start', 'api-key', props.tokenId],
    queryFn: () => getApiKey(props.tokenId ?? 0),
    enabled: configuredStepActive,
  })
  const apiKey = apiKeyQuery.data?.data

  const modelNamesQuery = useQuery({
    queryKey: ['quick-start', 'models', apiKey?.group],
    queryFn: async () => {
      const result = await getUserModels(apiKey?.group || undefined)
      return result.success ? (result.data ?? []) : []
    },
    enabled: configuredStepActive && apiKey !== undefined,
  })
  const pricing = usePricingData(configuredStepActive)

  const availableModels = useMemo(() => {
    const availableNames = new Set(modelNamesQuery.data ?? [])
    const limitedNames = apiKey?.model_limits_enabled
      ? new Set((apiKey.model_limits ?? '').split(',').filter(Boolean))
      : null

    return pricing.models.filter((model) => {
      if (!availableNames.has(model.model_name)) return false
      return !limitedNames || limitedNames.has(model.model_name)
    })
  }, [apiKey, modelNamesQuery.data, pricing.models])

  const selectedModel =
    availableModels.find((model) => model.model_name === selectedModelName) ??
    availableModels[0]
  const isLoading =
    apiKeyQuery.isLoading || modelNamesQuery.isLoading || pricing.isLoading
  const hasError = Boolean(
    apiKeyQuery.error || modelNamesQuery.error || pricing.error
  )

  const handleCreated = (createdKey: ApiKey) => {
    props.onTokenCreated(createdKey.id)
  }

  let modelStepContent: ReactNode
  if (hasError) {
    modelStepContent = (
      <Alert variant='destructive'>
        <AlertTitle>{t('Failed to load API key')}</AlertTitle>
        <AlertDescription>
          {t('Please refresh the page and try again.')}
        </AlertDescription>
      </Alert>
    )
  } else if (isLoading) {
    modelStepContent = (
      <div className='grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]'>
        <Skeleton className='h-96' />
        <Skeleton className='h-[32rem]' />
      </div>
    )
  } else if (availableModels.length === 0) {
    modelStepContent = (
      <Empty className='min-h-80 border'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <HugeiconsIcon icon={SparklesIcon} />
          </EmptyMedia>
          <EmptyTitle>
            {t('No models are available for this API key.')}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              'Ask an administrator to configure an available model, or update the API key model limits.'
            )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  } else {
    modelStepContent = (
      <div className='grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]'>
        <Card className='lg:sticky lg:top-4'>
          <CardHeader>
            <CardTitle>{t('Available models')}</CardTitle>
            <CardDescription>
              {t('Select a model to view its request example and parameters.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className='max-h-[32rem]'>
              <RadioGroup
                value={selectedModel?.model_name}
                onValueChange={setSelectedModelName}
                aria-label={t('Available models')}
                className='pr-3'
              >
                {availableModels.map((model) => (
                  <label
                    key={model.model_name}
                    className='hover:bg-muted/50 has-data-checked:bg-muted flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5'
                  >
                    <RadioGroupItem value={model.model_name} />
                    <span className='min-w-0 truncate font-mono text-sm'>
                      {model.model_name}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedModel && (
          <Card>
            <CardHeader>
              <CardTitle className='font-mono'>
                {selectedModel.model_name}
              </CardTitle>
              <CardDescription>{t('API request example')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ModelDetailsApi
                model={selectedModel}
                endpointMap={
                  pricing.endpointMap as Record<
                    string,
                    { path?: string; method?: string }
                  >
                }
              />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <Main>
      <div className='bg-background/95 supports-backdrop-filter:bg-background/80 shrink-0 border-b px-4 py-3 backdrop-blur sm:px-6'>
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-3'>
          <div>
            <h1 className='text-xl font-semibold tracking-tight'>
              {t('Quick Start')}
            </h1>
            <p className='text-muted-foreground text-sm'>
              {t('Complete these steps to start sending requests.')}
            </p>
          </div>
          <QuickStartStepNav
            activeStep={configuredStepActive ? props.step : 'key'}
            modelStepEnabled={props.tokenId !== undefined}
            codexStepEnabled={
              props.tokenId !== undefined && availableModels.length > 0
            }
            onStepChange={props.onStepChange}
          />
        </div>
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='mx-auto w-full max-w-6xl p-4 sm:p-6'>
          {!configuredStepActive ? (
            <ApiKeysProvider>
              <ApiKeysMutateDrawer
                open
                embedded
                onOpenChange={() => undefined}
                onCreated={handleCreated}
              />
            </ApiKeysProvider>
          ) : (
            <div className='flex flex-col gap-4'>
              {apiKey && (
                <Alert>
                  <HugeiconsIcon icon={Key01Icon} />
                  <AlertTitle>{t('API key created')}</AlertTitle>
                  <AlertDescription>
                    {apiKey.name}{' '}
                    <Badge variant='secondary'>{`sk-${apiKey.key}`}</Badge>
                  </AlertDescription>
                </Alert>
              )}

              {codexStepActive && apiKey && selectedModel ? (
                <CodexConfiguration
                  apiKey={apiKey.key}
                  modelName={selectedModel.model_name}
                />
              ) : (
                modelStepContent
              )}

              <div className='flex flex-wrap justify-between gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    props.onStepChange(codexStepActive ? 'model' : 'key')
                  }
                >
                  {codexStepActive ? t('Back to model') : t('Back to API key')}
                </Button>
                <Button
                  type='button'
                  onClick={() =>
                    codexStepActive
                      ? props.onFinish()
                      : props.onStepChange('codex')
                  }
                  disabled={!selectedModel}
                >
                  {codexStepActive ? t('Finish') : t('Configure Codex')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Main>
  )
}
