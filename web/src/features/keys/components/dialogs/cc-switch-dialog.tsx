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
import { useState, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { Button } from '@/components/ui/button'
import { ComboboxInput } from '@/components/ui/combobox-input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { useApplicationModels } from '../../lib/use-application-models'
import type { ApiKey } from '../../types'

const APP_CONFIGS = {
  claude: {
    label: 'Claude',
    defaultName: 'One-Gateway',
    modelFields: [
      { key: 'model', labelKey: 'Primary Model', required: true },
      { key: 'haikuModel', labelKey: 'Haiku Model', required: false },
      { key: 'sonnetModel', labelKey: 'Sonnet Model', required: false },
      { key: 'opusModel', labelKey: 'Opus Model', required: false },
    ],
  },
  codex: {
    label: 'Codex',
    defaultName: 'One-Gateway',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  gemini: {
    label: 'Gemini',
    defaultName: 'One-Gateway',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
} as const

type AppType = keyof typeof APP_CONFIGS

function getServerAddress(): string {
  try {
    const raw = localStorage.getItem('status')
    if (raw) {
      const status = JSON.parse(raw)
      if (status.server_address) return status.server_address
    }
  } catch {
    /* empty */
  }
  return window.location.origin
}

function buildCCSwitchURL(
  app: string,
  name: string,
  models: Record<string, string>,
  apiKey: string
): string {
  const serverAddress = getServerAddress().replace(/\/+$/, '')
  const endpoint = app === 'codex' ? `${serverAddress}/v1` : serverAddress
  const params = new URLSearchParams()
  params.set('resource', 'provider')
  params.set('app', app)
  params.set('name', name)
  params.set('endpoint', endpoint)
  params.set('apiKey', apiKey)
  for (const [k, v] of Object.entries(models)) {
    if (v) params.set(k, v)
  }
  params.set('homepage', serverAddress)
  params.set('enabled', 'true')
  return `ccswitch://v1/import?${params.toString()}`
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenKey: string
  embedded?: boolean
  application?: 'codex' | 'claude'
  apiKey?: ApiKey
}

export function CCSwitchDialog(props: Props) {
  const { t } = useTranslation()
  const id = useId()
  const [chosenApp, setApp] = useState<AppType | null>(null)
  const [name, setName] = useState<string>('One-Gateway')
  const [models, setModels] = useState<Record<string, string>>({})

  const { modelsByApp, isLoading, isError } = useApplicationModels(
    props.apiKey,
    props.open
  )
  const defaultApp =
    (Object.keys(APP_CONFIGS) as AppType[]).find(
      (candidate) => modelsByApp[candidate].length > 0
    ) ?? 'claude'
  const app = props.application ?? chosenApp ?? defaultApp
  const modelOptions = modelsByApp[app].map((model) => ({
    value: model,
    label: model,
  }))
  const selectedModels = { ...models }
  for (const key of Object.keys(selectedModels)) {
    if (!modelOptions.some((option) => option.value === selectedModels[key])) {
      delete selectedModels[key]
    }
  }
  selectedModels.model ||= modelOptions[0]?.value ?? ''

  useEffect(() => {
    if (props.open && !props.embedded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModels({})

      setApp(null)

      setName(APP_CONFIGS.claude.defaultName)
    }
  }, [props.open, props.embedded])

  const currentConfig = APP_CONFIGS[app]

  const handleAppChange = (val: string) => {
    const appVal = val as AppType
    setApp(appVal)
    setName(APP_CONFIGS[appVal].defaultName)
    setModels({})
  }

  const handleSubmit = () => {
    if (!selectedModels.model) {
      toast.warning(t('Please select a primary model'))
      return
    }
    const key = props.tokenKey.startsWith('sk-')
      ? props.tokenKey
      : `sk-${props.tokenKey}`
    const url = buildCCSwitchURL(app, name, selectedModels, key)
    window.open(url, '_blank')
    if (!props.embedded) props.onOpenChange(false)
  }

  const formContent = (
    <div className='space-y-4'>
      {!props.embedded && (
        <div className='space-y-2'>
          <Label id={`${id}-application`}>{t('Application')}</Label>
          <RadioGroup
            aria-labelledby={`${id}-application`}
            value={app}
            onValueChange={handleAppChange}
            className='flex gap-4'
          >
            {(
              Object.entries(APP_CONFIGS) as [
                AppType,
                (typeof APP_CONFIGS)[AppType],
              ][]
            ).map(([key, cfg]) => (
              <div key={key} className='flex items-center gap-2'>
                <RadioGroupItem value={key} id={`${id}-app-${key}`} />
                <Label htmlFor={`${id}-app-${key}`} className='cursor-pointer'>
                  {cfg.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className='space-y-2'>
        <Label htmlFor={`${id}-name`}>{t('Name')}</Label>
        <ComboboxInput
          id={`${id}-name`}
          options={[]}
          value={name}
          onValueChange={setName}
          placeholder={currentConfig.defaultName}
          emptyText=''
          allowCustomValue
        />
      </div>

      {isError ? (
        <p role='alert' className='text-destructive text-sm'>
          {t('Failed to fetch models')}
        </p>
      ) : null}

      {currentConfig.modelFields.map((field) => (
        <div key={field.key} className='space-y-2'>
          <Label htmlFor={`${id}-${field.key}`}>
            {t(field.labelKey)}
            {field.required && (
              <span className='text-destructive ml-0.5'>*</span>
            )}
          </Label>
          <ComboboxInput
            id={`${id}-${field.key}`}
            options={modelOptions}
            value={selectedModels[field.key] || ''}
            onValueChange={(v) =>
              setModels((prev) => ({ ...prev, [field.key]: v }))
            }
            placeholder={t('Select or enter model name')}
            emptyText={t('No models found')}
          />
        </div>
      ))}
    </div>
  )

  const noCompatibleModels = !isLoading && !isError && modelOptions.length === 0
  const importActions = (
    <div
      role='group'
      aria-label={t('Import to CC Switch')}
      className='flex min-w-0 items-center gap-3'
    >
      <Button
        className='shrink-0'
        onClick={handleSubmit}
        aria-describedby={noCompatibleModels ? id + '-no-models' : undefined}
        disabled={isLoading || isError || !selectedModels.model || !name.trim()}
      >
        {props.embedded ? t('Import to CC Switch') : t('Open CC Switch')}
      </Button>
      {noCompatibleModels ? (
        <p
          id={id + '-no-models'}
          role='alert'
          className='text-destructive min-w-0 text-sm'
        >
          {t(
            'no model available for selected application, please choose other keys support the model or other compatible application'
          )}
        </p>
      ) : null}
    </div>
  )

  if (props.embedded) {
    return (
      <div className='space-y-4'>
        {formContent}
        {importActions}
        <p className='text-muted-foreground text-sm'>
          {t('Restart the application after the import is complete.')}
        </p>
      </div>
    )
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className={sideDrawerContentClassName('sm:max-w-md')}>
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Import to CC Switch')}</SheetTitle>
        </SheetHeader>

        <div className={sideDrawerFormClassName()}>{formContent}</div>

        <SheetFooter
          className={sideDrawerFooterClassName(
            'flex flex-col items-stretch sm:flex-col'
          )}
        >
          <SheetClose render={<Button variant='outline' />}>
            {t('Cancel')}
          </SheetClose>
          {importActions}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
