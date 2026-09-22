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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  prepareAttachments,
} from '../../lib/input/attachments'
import { isImageGenerationModel } from '../../lib/streaming/images'
import type {
  ModelOption,
  ParameterEnabled,
  PlaygroundConfig,
  PlaygroundAttachment,
} from '../../types'
import { PlaygroundAttachmentInputControls } from './playground-input-controls'
import { PlaygroundInputTools } from './playground-input-tools'

interface PlaygroundInputProps {
  config: PlaygroundConfig
  onSubmit: (text: string, attachments?: PlaygroundAttachment[]) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  models: ModelOption[]
  modelValue: string
  onModelChange: (value: string) => void
  isModelLoading?: boolean
  hasMessages?: boolean
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onClearMessages?: () => void
  onParameterEnabledChange: (
    key: keyof ParameterEnabled,
    value: boolean
  ) => void
  parameterEnabled: ParameterEnabled
}

export function PlaygroundInput({
  config,
  onSubmit,
  onStop,
  disabled,
  isGenerating,
  models,
  modelValue,
  onModelChange,
  isModelLoading = false,
  hasMessages = false,
  onConfigChange,
  onClearMessages,
  onParameterEnabledChange,
  parameterEnabled,
}: PlaygroundInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const handleSubmit = (message: PromptInputMessage) => {
    if (
      disabled ||
      !models.length ||
      (!message.text?.trim() && !message.files?.length)
    ) {
      throw new Error('Submission unavailable')
    }
    try {
      if (message.files?.length && isImageGenerationModel(config.model)) {
        throw new Error(
          'Attachments require a chat model that supports the selected file type.'
        )
      }
      const attachments = prepareAttachments(message.files ?? [])
      if (attachments.length) onSubmit(message.text ?? '', attachments)
      else onSubmit(message.text ?? '')
    } catch (error) {
      toast.error(
        t(
          error instanceof Error
            ? error.message
            : 'Unable to read attachment. Please attach it again.'
        )
      )
      throw error
    }
    setText((current) => (current === message.text ? '' : current))
  }

  return (
    <div className='grid shrink-0 gap-4 px-1 md:pb-4'>
      {isImageGenerationModel(config.model) && (
        <p className='text-muted-foreground px-3 text-xs'>
          {t(
            'Image generation uses your latest prompt only. Chat history and chat parameters are not sent.'
          )}
        </p>
      )}
      <PromptInput
        accept={ATTACHMENT_ACCEPT}
        multiple
        maxFiles={MAX_ATTACHMENTS}
        maxFileSize={MAX_ATTACHMENT_SIZE}
        onError={(error) => toast.error(error.message)}
        className='relative'
        groupClassName='bg-background/95 dark:bg-background/80 border-border/70 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.65)] ring-1 ring-foreground/5 rounded-xl overflow-hidden transition-all duration-200 focus-within:border-primary/45 focus-within:ring-primary/15 focus-within:shadow-[0_22px_70px_-34px_rgba(0,0,0,0.75)]'
        onSubmit={handleSubmit}
      >
        <div className='flex flex-wrap gap-2 px-3 pt-2'>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </div>
        <PromptInputTextarea
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='min-h-20 px-5 pt-4 pb-3 leading-7 md:min-h-24 md:text-base'
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('Ask anything')}
          value={text}
        />

        <PromptInputFooter className='border-border/60 bg-muted/20 dark:bg-muted/10 border-t px-3 py-2.5 backdrop-blur'>
          <PlaygroundAttachmentInputControls
            disabled={disabled}
            isGenerating={isGenerating}
            isModelLoading={isModelLoading}
            models={models}
            modelValue={modelValue}
            onModelChange={onModelChange}
            onStop={onStop}
            text={text}
            tools={
              <PlaygroundInputTools
                models={models}
                config={config}
                disabled={disabled}
                hasMessages={hasMessages}
                onConfigChange={onConfigChange}
                onClearMessages={onClearMessages}
                onParameterEnabledChange={onParameterEnabledChange}
                parameterEnabled={parameterEnabled}
              />
            }
          />
        </PromptInputFooter>
      </PromptInput>
      <p className='text-muted-foreground px-3 text-xs'>
        {t(
          'Attach images, PDFs or text files. Up to 4 files, 5 MiB each. Attachments are kept only until you reload.'
        )}
      </p>
    </div>
  )
}
