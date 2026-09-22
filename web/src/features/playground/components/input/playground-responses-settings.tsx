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
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { isClaudeModel } from '../../lib/streaming/responses'
import type { ModelOption, PlaygroundConfig } from '../../types'

type Props = {
  config: PlaygroundConfig
  disabled?: boolean
  models?: ModelOption[]
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
}

export function PlaygroundResponsesSettings(props: Props) {
  const { t } = useTranslation()
  const id = useId()
  if (isClaudeModel(props.config.model)) return null
  const responses = props.config.apiMode === 'responses'
  return (
    <fieldset
      className='border-border/70 grid min-w-0 gap-3 rounded-lg border p-3'
      disabled={props.disabled}
    >
      <legend className='px-1 text-sm font-medium'>
        {t('OpenAI Responses')}
      </legend>
      <div className='flex items-center justify-between gap-3'>
        <label htmlFor={`${id}-responses`} className='text-sm'>
          {t('Use Responses API')}
        </label>
        <Switch
          id={`${id}-responses`}
          checked={responses}
          disabled={props.disabled}
          onCheckedChange={(checked) =>
            props.onConfigChange('apiMode', checked ? 'responses' : 'chat')
          }
        />
      </div>
      <p className='text-muted-foreground text-xs'>
        {t('Enable for OpenAI models and channels that support Responses.')}
      </p>
      {responses && (
        <>
          <div className='flex items-center justify-between gap-3'>
            <label htmlFor={`${id}-images`} className='text-sm'>
              {t('Image generation')}
            </label>
            <Switch
              id={`${id}-images`}
              checked={Boolean(props.config.imageGeneration)}
              disabled={props.disabled}
              onCheckedChange={(checked) =>
                props.onConfigChange('imageGeneration', checked)
              }
            />
          </div>
          {props.config.imageGeneration && (
            <div className='grid gap-2'>
              <label htmlFor={`${id}-model`} className='text-sm'>
                {t('Image model')}
              </label>
              <Input
                id={`${id}-model`}
                list={`${id}-models`}
                value={props.config.imageModel ?? ''}
                disabled={props.disabled}
                placeholder={t('Provider default')}
                onChange={(event) =>
                  props.onConfigChange('imageModel', event.target.value)
                }
              />
              <datalist id={`${id}-models`}>
                {props.models?.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </datalist>
              <p className='text-muted-foreground text-xs'>
                {t(
                  'Use an image model supported by the selected chat channel, or leave blank for its default.'
                )}
              </p>
              <p className='text-muted-foreground text-xs'>
                {t(
                  'Generated images are available until you refresh. Download them to keep a copy.'
                )}
              </p>
            </div>
          )}
        </>
      )}
    </fieldset>
  )
}
