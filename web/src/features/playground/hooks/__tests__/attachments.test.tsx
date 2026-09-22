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
import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../constants'
import { prepareAttachments } from '../../lib/input/attachments'
import { appendUserMessagePair } from '../../lib/message/conversation-message-utils'
import type { Message, PlaygroundConfig } from '../../types'
import { useChatHandler } from '../use-chat-handler'

function useConversation(config: PlaygroundConfig) {
  const [messages, setMessages] = useState<Message[]>([])
  const handler = useChatHandler({
    config,
    parameterEnabled: DEFAULT_PARAMETER_ENABLED,
    onMessageUpdate: setMessages,
  })
  return { ...handler, messages }
}

describe('Attachment request guards', () => {
  it('sends a new text-only prompt when older messages have expired attachments', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        choices: [
          {
            message: { role: 'assistant', content: 'Hello' },
            finish_reason: 'stop',
          },
        ],
      },
    })
    const { result } = renderHook(() =>
      useConversation({ ...DEFAULT_CONFIG, model: 'gpt-4o', stream: false })
    )
    const history = appendUserMessagePair([], 'An earlier attachment')
    history[0].versions[0].attachmentsOmitted = true
    history[1].status = 'complete'
    history[1].versions[0].content = 'Earlier answer'
    await act(async () => {
      result.current.sendChat(
        appendUserMessagePair(history, 'Hello without attachments')
      )
    })
    await waitFor(() => expect(post).toHaveBeenCalledOnce())
    expect(post.mock.calls[0][1]).toMatchObject({
      messages: expect.arrayContaining([
        { role: 'user', content: 'Hello without attachments' },
      ]),
    })
    await waitFor(() =>
      expect(result.current.messages.at(-1)?.status).toBe('complete')
    )
    expect(result.current.messages[0].versions[0].attachmentsOmitted).toBe(true)
  })

  it.each([true, false])(
    'blocks missing attachments after reload with streaming=%s',
    async (stream) => {
      const post = vi.spyOn(api, 'post')
      const fetchRequest = vi.spyOn(globalThis, 'fetch')
      const { result } = renderHook(() =>
        useConversation({ ...DEFAULT_CONFIG, model: 'gpt-4o', stream })
      )
      const messages = appendUserMessagePair([], '')
      messages[0].versions[0].attachmentsOmitted = true
      await act(async () => {
        result.current.sendChat(messages)
      })
      expect(post).not.toHaveBeenCalled()
      expect(fetchRequest).not.toHaveBeenCalled()
      expect(result.current.messages.at(-1)?.status).toBe('error')
      expect(result.current.messages.at(-1)?.versions[0].content).toContain(
        'Attachments are no longer available'
      )
      expect(result.current.isGenerating).toBe(false)
    }
  )
  it('blocks regenerating attachments through the text-only image generation endpoint', async () => {
    const post = vi.spyOn(api, 'post')
    const { result } = renderHook(() =>
      useConversation({ ...DEFAULT_CONFIG, model: 'gpt-image-1' })
    )
    const attachments = prepareAttachments([
      {
        type: 'file',
        filename: 'image.png',
        mediaType: 'image/png',
        url: 'data:image/png;base64,aW1hZ2U=',
      },
    ])
    await act(async () => {
      result.current.sendChat(
        appendUserMessagePair([], 'Edit this', attachments)
      )
    })
    expect(post).not.toHaveBeenCalled()
    expect(result.current.messages.at(-1)?.status).toBe('error')
    expect(result.current.messages.at(-1)?.versions[0].content).toContain(
      'Attachments require a chat model'
    )
  })
})
