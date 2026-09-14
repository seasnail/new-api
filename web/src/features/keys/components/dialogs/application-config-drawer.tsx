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
import { useTranslation } from 'react-i18next'

import {
  sideDrawerContentClassName,
  sideDrawerHeaderClassName,
  sideDrawerFormClassName,
  sideDrawerFooterClassName,
} from '@/components/drawer-layout'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

import type { ApiKey } from '../../types'
import { ClaudeConfigDrawer } from './claude-config-drawer'
import { CodexConfigDrawer } from './codex-config-drawer'

export function ApplicationConfigDrawer(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: ApiKey
  tokenKey: string
}) {
  const { t } = useTranslation()
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        className={sideDrawerContentClassName('max-w-none sm:!max-w-[960px]')}
      >
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Configure application')}</SheetTitle>
        </SheetHeader>
        <div className={sideDrawerFormClassName()}>
          <Tabs defaultValue='codex'>
            <TabsList aria-label={t('Application')}>
              <TabsTrigger value='codex'>Codex</TabsTrigger>
              <TabsTrigger value='claude'>Claude</TabsTrigger>
            </TabsList>
            <TabsContent value='codex' className='mt-4'>
              <CodexConfigDrawer {...props} embedded />
            </TabsContent>
            <TabsContent value='claude' className='mt-4'>
              <ClaudeConfigDrawer {...props} embedded />
            </TabsContent>
          </Tabs>
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
