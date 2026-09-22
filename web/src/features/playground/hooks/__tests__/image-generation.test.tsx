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
import { describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../constants'
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

describe('main image model selection', () => {
  test.each([true, false])(
    'routes the selected image model to Images when streaming is %s',
    async (stream) => {
      const post = vi
        .spyOn(api, 'post')
        .mockResolvedValue({ data: { data: [{ b64_json: 'aGVsbG8=' }] } })
      const config = {
        ...DEFAULT_CONFIG,
        model: 'gpt-image-2.5-sunburst',
        apiMode: 'responses' as const,
        stream,
        imageGeneration: true,
        imageModel: 'other-tool-model',
      }
      const { result } = renderHook(() => useConversation(config))
      await act(async () => {
        result.current.sendChat(appendUserMessagePair([], 'Draw a robot'))
      })
      await waitFor(() => expect(result.current.isGenerating).toBe(false))
      expect(post).toHaveBeenCalledWith(
        '/pg/images/generations',
        {
          model: config.model,
          group: '',
          prompt: 'Draw a robot',
          n: 1,
          output_format: 'png',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
      expect(result.current.messages.at(-1)?.status).toBe('complete')
      expect(
        result.current.messages.at(-1)?.versions[0].images?.[0].result
      ).toBe('aGVsbG8=')
    }
  )

  test('uses only the newest user prompt and keeps the selected group', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: [{ b64_json: 'aGVsbG8=' }] } })
    const { result } = renderHook(() =>
      useConversation({
        ...DEFAULT_CONFIG,
        model: 'gpt-image-2.5-sunburst',
        group: 'vip',
      })
    )
    const messages = appendUserMessagePair(
      appendUserMessagePair([], 'Old prompt'),
      'New prompt'
    )
    await act(async () => {
      result.current.sendChat(messages)
    })
    expect(post).toHaveBeenCalledWith(
      '/pg/images/generations',
      expect.objectContaining({ prompt: 'New prompt', group: 'vip' }),
      expect.anything()
    )
    expect(post.mock.calls[0][1]).not.toHaveProperty('messages')
    expect(post.mock.calls[0][1]).not.toHaveProperty('temperature')
  })

  test('ignores a late image result after cancellation', async () => {
    let finish!: (value: { data: { data: { b64_json: string }[] } }) => void
    const post = vi.spyOn(api, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const { result } = renderHook(() =>
      useConversation({ ...DEFAULT_CONFIG, model: 'gpt-image-2.5-sunburst' })
    )
    act(() => {
      result.current.sendChat(appendUserMessagePair([], 'Draw a robot'))
    })
    expect(result.current.isGenerating).toBe(true)
    act(() => {
      result.current.stopGeneration()
    })
    expect(post.mock.calls[0][2]?.signal?.aborted).toBe(true)
    await act(async () => {
      finish({ data: { data: [{ b64_json: 'aGVsbG8=' }] } })
    })
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.messages.at(-1)?.versions[0].images).toBeUndefined()
  })

  test('shows an error instead of silently completing an empty image response', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { data: [] } })
    const { result } = renderHook(() =>
      useConversation({ ...DEFAULT_CONFIG, model: 'gpt-image-2.5-sunburst' })
    )
    await act(async () => {
      result.current.sendChat(appendUserMessagePair([], 'Draw a robot'))
    })
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.messages.at(-1)?.status).toBe('error')
  })

  test('switching back to a chat model preserves the Responses route', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({
        data: {
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'Hello' }],
            },
          ],
        },
      })
    const config = {
      ...DEFAULT_CONFIG,
      model: 'gpt-image-2.5-sunburst',
      apiMode: 'responses' as const,
      stream: false,
    }
    const { result, rerender } = renderHook(
      (nextConfig) => useConversation(nextConfig),
      { initialProps: config }
    )
    rerender({ ...config, model: 'gpt-5.6-luna' })
    await act(async () => {
      result.current.sendChat(appendUserMessagePair([], 'Hello'))
    })
    expect(post).toHaveBeenCalledWith(
      '/pg/responses',
      expect.objectContaining({ model: 'gpt-5.6-luna' }),
      expect.anything()
    )
    expect(result.current.messages.at(-1)?.versions[0].content).toBe('Hello')
  })
})
