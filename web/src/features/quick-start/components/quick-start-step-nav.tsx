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
import { Key01Icon, SparklesIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type QuickStartStep = 'key' | 'model'

type QuickStartStepNavProps = {
  activeStep: QuickStartStep
  modelStepEnabled: boolean
  onStepChange: (step: QuickStartStep) => void
}

export function QuickStartStepNav(props: QuickStartStepNavProps) {
  const { t } = useTranslation()
  const steps = [
    {
      id: 'key' as const,
      label: t('Create API Key'),
      icon: Key01Icon,
      enabled: true,
    },
    {
      id: 'model' as const,
      label: t('Choose a model and make your first request'),
      icon: SparklesIcon,
      enabled: props.modelStepEnabled,
    },
  ]

  return (
    <nav aria-label={t('Quick start steps')}>
      <ol className='grid gap-2 sm:grid-cols-2'>
        {steps.map((step, index) => {
          const active = step.id === props.activeStep
          const completed = step.id === 'key' && props.modelStepEnabled

          return (
            <li key={step.id}>
              <Button
                type='button'
                variant={active ? 'default' : 'outline'}
                className='h-auto w-full justify-start py-3 text-left'
                disabled={!step.enabled}
                aria-current={active ? 'step' : undefined}
                onClick={() => props.onStepChange(step.id)}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    active
                      ? 'border-primary-foreground/40'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {completed && !active ? (
                    <HugeiconsIcon icon={Tick02Icon} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className='flex min-w-0 items-center gap-2'>
                  <HugeiconsIcon icon={step.icon} aria-hidden='true' />
                  <span className='truncate'>{step.label}</span>
                </span>
              </Button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export type { QuickStartStep }
