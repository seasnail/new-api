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
import {
  GlobeIcon,
  PaperclipIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PromptInputButton,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { isSearchEnabled } from '../../lib'
import { isImageGenerationModel } from '../../lib/streaming/images'
import { isClaudeModel } from '../../lib/streaming/responses'
import type {
  ModelOption,
  ParameterEnabled,
  PlaygroundConfig,
} from '../../types'
import { PlaygroundParameterPanel } from './playground-parameter-panel'

type PlaygroundInputToolsProps = {
  models?: ModelOption[]
  config: PlaygroundConfig
  disabled?: boolean
  hasMessages?: boolean
  onClearMessages?: () => void
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (
    key: keyof ParameterEnabled,
    value: boolean
  ) => void
  parameterEnabled: ParameterEnabled
}

export function PlaygroundInputTools({
  models,
  config,
  disabled,
  hasMessages = false,
  onClearMessages,
  onConfigChange,
  onParameterEnabledChange,
  parameterEnabled,
}: PlaygroundInputToolsProps) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const searchEnabled = isSearchEnabled(config)

  const handleSearchAction = () => {
    if (!searchEnabled) onConfigChange('apiMode', 'responses')
    onConfigChange('webSearch', !searchEnabled)
  }

  const handleClearMessages = () => {
    onClearMessages?.()
    setClearConfirmOpen(false)
    toast.success(t('Conversation cleared'))
  }

  return (
    <>
      <PromptInputTools className='bg-background/70 border-border/60 rounded-lg border p-1 shadow-xs'>
        <Tooltip>
          <TooltipTrigger
            render={
              <PromptInputButton
                aria-label={t('Attach')}
                className='text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium'
                disabled={disabled || isImageGenerationModel(config.model)}
                onClick={attachments.openFileDialog}
                variant='ghost'
              >
                <PaperclipIcon size={16} />
              </PromptInputButton>
            }
          />
          <TooltipContent className='max-w-xs'>
            <p>
              {t(
                'Attach images, PDFs or text files. Up to 4 files, 5 MiB each. Attachments are kept only until you reload.'
              )}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <PromptInputButton
                aria-label={t('Search')}
                aria-pressed={searchEnabled}
                className='text-muted-foreground hover:text-foreground hover:bg-muted/70 aria-pressed:bg-primary/10 aria-pressed:text-primary font-medium'
                disabled={
                  disabled ||
                  isClaudeModel(config.model) ||
                  isImageGenerationModel(config.model)
                }
                onClick={handleSearchAction}
                variant='ghost'
              >
                <GlobeIcon size={16} />
              </PromptInputButton>
            }
          />
          <TooltipContent>
            <p>
              {t(
                'Search the web using a model and channel that support Responses web search.'
              )}
            </p>
          </TooltipContent>
        </Tooltip>

        {isImageGenerationModel(config.model) ? (
          <Popover>
            <PopoverTrigger
              render={
                <PromptInputButton
                  aria-label={t('Image generation')}
                  className='text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium'
                  variant='ghost'
                >
                  <SlidersHorizontalIcon size={16} aria-hidden='true' />
                </PromptInputButton>
              }
            />
            <PopoverContent
              align='start'
              side='top'
              className='w-80 max-w-[calc(100vw-2rem)] p-4'
            >
              <PopoverTitle>{t('Image generation')}</PopoverTitle>
              <PopoverDescription className='text-sm leading-relaxed'>
                {t(
                  'To use chat history and supported parameters, select a compatible OpenAI chat model instead. Open Parameters, enable Use Responses API and Image generation, then choose an Image model supported by your channel.'
                )}
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        ) : (
          <PlaygroundParameterPanel
            models={models}
            config={config}
            disabled={disabled}
            onConfigChange={onConfigChange}
            onParameterEnabledChange={onParameterEnabledChange}
            parameterEnabled={parameterEnabled}
          />
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <PromptInputButton
                aria-label={t('Clear chat history')}
                className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium'
                disabled={disabled || !hasMessages || !onClearMessages}
                onClick={() => setClearConfirmOpen(true)}
                variant='ghost'
              >
                <Trash2Icon size={16} />
              </PromptInputButton>
            }
          />
          <TooltipContent>
            <p>{t('Clear chat history')}</p>
          </TooltipContent>
        </Tooltip>
      </PromptInputTools>

      <ConfirmDialog
        destructive
        desc={t(
          'All Quick Chat messages saved in this browser will be removed. This cannot be undone.'
        )}
        confirmText={t('Clear')}
        handleConfirm={handleClearMessages}
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title={t('Clear chat history?')}
      />
    </>
  )
}
