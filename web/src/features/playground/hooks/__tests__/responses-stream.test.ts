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
import { describe, expect, test, vi } from 'vitest'

import { ERROR_MESSAGES } from '../../constants'
import type { ResponsesRequest } from '../../types'
import { createStreamRequestController } from '../use-stream-request'

class ResponseStream {
  readyState = 1
  close = vi.fn()
  stream = vi.fn()
  private listeners = new Map<
    string,
    ((event: Event & { data?: string; readyState?: number }) => void)[]
  >()
  addEventListener(
    type: string,
    listener: (event: Event & { data?: string; readyState?: number }) => void
  ) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  emit(type: string, data?: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({
        data: data === undefined ? undefined : JSON.stringify(data),
        readyState: this.readyState,
      } as Event & { data?: string; readyState?: number })
    }
  }
}

const payload: ResponsesRequest = {
  model: 'gpt-test',
  input: [{ role: 'user', content: 'Draw a robot' }],
  store: false,
  stream: true,
}

async function setup() {
  const source = new ResponseStream()
  const callbacks = {
    onUpdate: vi.fn(),
    onResponseEvent: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  }
  const controller = createStreamRequestController({
    getHeaders: async () => ({}),
    createSource: () => source,
    setStreaming: vi.fn(),
  })
  await controller.send(payload, callbacks)
  return { source, controller, callbacks }
}

describe('Responses stream lifecycle', () => {
  test('handles named text and image events and finishes on response.completed without DONE', async () => {
    const { source, callbacks } = await setup()
    const delta = { type: 'response.output_text.delta', delta: 'Drawing' }
    source.emit(delta.type, delta)
    const image = {
      type: 'image_generation_call',
      id: 'img_1',
      status: 'completed',
      result: 'aGVsbG8=',
    }
    source.emit('response.output_item.done', {
      type: 'response.output_item.done',
      item: image,
    })
    source.emit('response.completed', {
      type: 'response.completed',
      response: { status: 'completed', output: [image] },
    })
    expect(callbacks.onResponseEvent).toHaveBeenCalledTimes(3)
    expect(callbacks.onResponseEvent).toHaveBeenCalledWith(delta)
    expect(callbacks.onComplete).toHaveBeenCalledOnce()
    expect(callbacks.onError).not.toHaveBeenCalled()
    expect(source.close).toHaveBeenCalledOnce()
  })

  test.each(['response.failed', 'response.incomplete', 'error'])(
    'surfaces %s even when HTTP status was successful',
    async (type) => {
      const { source, callbacks } = await setup()
      source.emit(type, {
        type,
        message: 'Image generation denied',
        response: { error: { message: 'Image generation denied' } },
      })
      expect(callbacks.onError).toHaveBeenCalledWith(
        'Image generation denied',
        undefined
      )
      expect(callbacks.onComplete).not.toHaveBeenCalled()
      expect(source.close).toHaveBeenCalledOnce()
    }
  )

  test('reports a stream that closes before a terminal event', async () => {
    const { source, callbacks } = await setup()
    source.readyState = 2
    source.emit('readystatechange')
    expect(callbacks.onError).toHaveBeenCalledWith(
      ERROR_MESSAGES.CONNECTION_CLOSED,
      undefined
    )
    expect(callbacks.onComplete).not.toHaveBeenCalled()
  })

  test('ignores queued events and errors after stopping generation', async () => {
    const { source, callbacks, controller } = await setup()
    controller.stop()
    source.emit('response.output_text.delta', {
      type: 'response.output_text.delta',
      delta: 'late',
    })
    source.emit('response.failed', { type: 'response.failed' })
    expect(callbacks.onResponseEvent).not.toHaveBeenCalled()
    expect(callbacks.onError).not.toHaveBeenCalled()
  })

  test('surfaces JSON HTTP errors without losing the upstream message', async () => {
    const { source, callbacks } = await setup()
    source.emit('error', {
      error: { message: 'Model unavailable', code: 'model_not_found' },
    })
    expect(callbacks.onError).toHaveBeenCalledWith(
      'Model unavailable',
      'model_not_found'
    )
  })
})
