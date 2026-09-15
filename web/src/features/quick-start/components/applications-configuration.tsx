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
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CCSwitchDialog } from '@/features/keys/components/dialogs/cc-switch-dialog'
import { ClaudeConfigDrawer } from '@/features/keys/components/dialogs/claude-config-drawer'
import { CodexConfigDrawer } from '@/features/keys/components/dialogs/codex-config-drawer'
import { useApplicationModels } from '@/features/keys/lib/use-application-models'
import type { ApiKey } from '@/features/keys/types'

export function ApplicationsConfiguration(props: { apiKey: ApiKey }) {
  const { t } = useTranslation()
  const [chosenApp, setChosenApp] = useState<string | null>(null)
  const { modelsByApp } = useApplicationModels(props.apiKey)
  const defaultApp =
    modelsByApp.codex.length === 0 && modelsByApp.claude.length > 0
      ? 'claude'
      : 'codex'
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Configure Applications')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={chosenApp ?? defaultApp} onValueChange={setChosenApp}>
          <TabsList aria-label={t('Application')}>
            <TabsTrigger value='codex'>Codex</TabsTrigger>
            <TabsTrigger value='claude'>Claude</TabsTrigger>
          </TabsList>
          <TabsContent value='codex' className='mt-4'>
            <h3 className='mb-4 font-semibold'>
              {t('Option 1: Import to CC Switch')}
            </h3>
            <CCSwitchDialog
              embedded
              open
              application='codex'
              apiKey={props.apiKey}
              tokenKey={props.apiKey.key}
              onOpenChange={() => undefined}
            />
            <Collapsible defaultOpen={false} className='mt-8'>
              <h3>
                <CollapsibleTrigger className='group focus-visible:ring-ring flex w-full items-center justify-between rounded-md py-3 text-left font-semibold focus-visible:ring-2 focus-visible:outline-none'>
                  {t('Option 2: Configure manually')}
                  <ChevronDown
                    aria-hidden='true'
                    className='size-4 shrink-0 transition-transform group-data-panel-open:rotate-180'
                  />
                </CollapsibleTrigger>
              </h3>
              <CollapsibleContent className='pt-4'>
                <CodexConfigDrawer
                  embedded
                  open
                  onOpenChange={() => undefined}
                  apiKey={props.apiKey}
                  tokenKey={props.apiKey.key}
                />
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>
          <TabsContent value='claude' className='mt-4'>
            <h3 className='mb-4 font-semibold'>
              {t('Option 1: Import to CC Switch')}
            </h3>
            <CCSwitchDialog
              embedded
              open
              application='claude'
              apiKey={props.apiKey}
              tokenKey={props.apiKey.key}
              onOpenChange={() => undefined}
            />
            <Collapsible defaultOpen={false} className='mt-8'>
              <h3>
                <CollapsibleTrigger className='group focus-visible:ring-ring flex w-full items-center justify-between rounded-md py-3 text-left font-semibold focus-visible:ring-2 focus-visible:outline-none'>
                  {t('Option 2: Configure manually')}
                  <ChevronDown
                    aria-hidden='true'
                    className='size-4 shrink-0 transition-transform group-data-panel-open:rotate-180'
                  />
                </CollapsibleTrigger>
              </h3>
              <CollapsibleContent className='pt-4'>
                <ClaudeConfigDrawer
                  embedded
                  open
                  onOpenChange={() => undefined}
                  apiKey={props.apiKey}
                  tokenKey={props.apiKey.key}
                />
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
