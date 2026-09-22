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
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../constants'
import { appendUserMessagePair } from '../../lib/message/conversation-message-utils'
import type { Message } from '../../types'
import { useChatHandler } from '../use-chat-handler'

test('Claude ignores saved Responses and image-tool settings when sending a request', async () => {
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
  const { result } = renderHook(() => {
    const [messages, setMessages] = useState<Message[]>([])
    const handler = useChatHandler({
      config: {
        ...DEFAULT_CONFIG,
        model: 'claude-sonnet-4-6',
        apiMode: 'responses',
        imageGeneration: true,
        imageModel: 'gpt-image-2.5-sunburst',
        stream: false,
      },
      parameterEnabled: DEFAULT_PARAMETER_ENABLED,
      onMessageUpdate: setMessages,
    })
    return { ...handler, messages }
  })
  await act(async () => {
    result.current.sendChat(appendUserMessagePair([], 'Hello'))
  })
  expect(post).toHaveBeenCalledWith(
    '/pg/chat/completions',
    expect.objectContaining({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'Hello' }],
    }),
    expect.anything()
  )
  expect(post.mock.calls[0][1]).not.toHaveProperty('tools')
  expect(result.current.messages.at(-1)?.versions[0].content).toBe('Hello')
})
