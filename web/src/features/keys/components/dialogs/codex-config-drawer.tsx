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

import ccSwitchOpenProviderScreenshot from '@/assets/codex-ccswitch 1.png'
import ccSwitchAddProviderScreenshot from '@/assets/codex-ccswitch 2.png'
import ccSwitchConfigureProviderScreenshot from '@/assets/codex-ccswitch 3.png'
import {
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CodexConfiguration } from '@/features/quick-start/components/codex-configuration'
import { getUserModels } from '@/lib/api'

import type { ApiKey } from '../../types'

type CodexConfigDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: ApiKey | null
  tokenKey: string
}

export function CodexConfigDrawer(props: CodexConfigDrawerProps) {
  const { t } = useTranslation()
  const [selectedModelName, setSelectedModelName] = useState('')
  const [configurationMethod, setConfigurationMethod] = useState('cc-switch')
  const modelsQuery = useQuery({
    queryKey: ['api-key-codex-config', 'models', props.apiKey?.group],
    queryFn: async () => {
      const result = await getUserModels(props.apiKey?.group || undefined)
      if (!result.success) {
        throw new Error(result.message)
      }
      return result.data ?? []
    },
    enabled: props.open && props.apiKey !== null,
  })

  const availableModels = useMemo(() => {
    const modelNames = modelsQuery.data ?? []
    if (!props.apiKey?.model_limits_enabled) return modelNames

    const allowedModels = new Set(
      (props.apiKey.model_limits ?? '').split(',').filter(Boolean)
    )
    return modelNames.filter((modelName) => allowedModels.has(modelName))
  }, [modelsQuery.data, props.apiKey])
  const defaultModelName =
    availableModels.find((modelName) =>
      modelName.toLowerCase().includes('codex')
    ) ?? availableModels[0]
  const selectedModel = availableModels.includes(selectedModelName)
    ? selectedModelName
    : defaultModelName
  const modelItems = useMemo(
    () =>
      availableModels.map((modelName) => ({
        label: modelName,
        value: modelName,
      })),
    [availableModels]
  )

  let drawerContent: ReactNode
  if (modelsQuery.isLoading) {
    drawerContent = (
      <div className='text-muted-foreground py-8 text-center text-sm'>
        {t('Loading...')}
      </div>
    )
  } else if (modelsQuery.isError) {
    drawerContent = (
      <Alert variant='destructive'>
        <AlertTitle>{t('Failed to fetch models')}</AlertTitle>
        <AlertDescription>
          {t('Please refresh the page and try again.')}
        </AlertDescription>
      </Alert>
    )
  } else if (availableModels.length === 0) {
    drawerContent = (
      <Empty className='min-h-48 border'>
        <EmptyHeader>
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
    drawerContent = (
      <>
        <div className='space-y-2'>
          <label className='text-sm font-medium' htmlFor='codex-model'>
            {t('Available models')}
          </label>
          <Select
            items={modelItems}
            value={selectedModel}
            onValueChange={(value) => setSelectedModelName(value ?? '')}
          >
            <SelectTrigger id='codex-model' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {availableModels.map((modelName) => (
                  <SelectItem key={modelName} value={modelName}>
                    {modelName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <CodexConfiguration
          apiKey={props.tokenKey}
          embedded
          modelName={selectedModel}
        />
      </>
    )
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        className={sideDrawerContentClassName('max-w-none sm:!max-w-[960px]')}
      >
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Configure Codex')}</SheetTitle>
          <SheetDescription>
            {t(
              'Connect Codex to this service with the API key and model you selected.'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className={sideDrawerFormClassName('gap-4')}>
          <FieldSet>
            <FieldLegend variant='label'>
              {t('Configuration method')}
            </FieldLegend>
            <RadioGroup
              value={configurationMethod}
              onValueChange={setConfigurationMethod}
            >
              <FieldGroup className='gap-3 sm:flex-row'>
                <Field orientation='horizontal'>
                  <RadioGroupItem
                    value='cc-switch'
                    id='codex-method-cc-switch'
                  />
                  <FieldLabel
                    htmlFor='codex-method-cc-switch'
                    className='font-normal'
                  >
                    CC Switch
                  </FieldLabel>
                </Field>
                <Field orientation='horizontal'>
                  <RadioGroupItem
                    value='command-line'
                    id='codex-method-command-line'
                  />
                  <FieldLabel
                    htmlFor='codex-method-command-line'
                    className='font-normal'
                  >
                    {t('Command line')}
                  </FieldLabel>
                </Field>
              </FieldGroup>
            </RadioGroup>
          </FieldSet>
          {configurationMethod === 'cc-switch' ? (
            <div className='flex flex-col gap-4'>
              <Alert>
                <AlertTitle>{t('Before you begin')}</AlertTitle>
                <AlertDescription>
                  {t(
                    'Quit ChatGPT and Codex completely before editing the provider configuration.'
                  )}
                </AlertDescription>
              </Alert>

              <figure className='space-y-2'>
                <figcaption>
                  <h3 className='font-medium'>
                    {t('1: Open the provider form')}
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {t(
                      'In CC Switch, select Codex, then click the plus button to add a provider.'
                    )}
                  </p>
                </figcaption>
                <img
                  src={ccSwitchOpenProviderScreenshot}
                  alt={t('CC Switch setup step 1')}
                  width={893}
                  height={345}
                  className='h-auto w-full rounded-lg border'
                />
              </figure>

              <figure className='space-y-2'>
                <figcaption>
                  <h3 className='font-medium'>
                    {t('2: Enter provider details')}
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {t(
                      'Enter the provider name, API key, API request URL, and default model. Select Responses (native), then add the provider.'
                    )}
                  </p>
                </figcaption>
                <img
                  src={ccSwitchAddProviderScreenshot}
                  alt={t('CC Switch setup step 2')}
                  width={900}
                  height={1099}
                  className='h-auto w-full rounded-lg border'
                />
              </figure>

              <figure className='space-y-2'>
                <figcaption>
                  <h3 className='font-medium'>
                    {t('3: Enable the provider')}
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {t(
                      'Find the new provider in the Codex list and click Enable.'
                    )}
                  </p>
                </figcaption>
                <img
                  src={ccSwitchConfigureProviderScreenshot}
                  alt={t('CC Switch setup step 3')}
                  className='h-auto w-full rounded-lg border'
                />
              </figure>

              <Alert>
                <AlertTitle>{t('Restart Codex')}</AlertTitle>
                <AlertDescription>
                  {t('Restart ChatGPT and Codex after completing these steps.')}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            drawerContent
          )}
        </div>

        <SheetFooter className={sideDrawerFooterClassName('grid-cols-1')}>
          <SheetClose render={<Button variant='outline' />}>
            {t('Close')}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
