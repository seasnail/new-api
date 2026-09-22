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
import { useCallback, useEffect, useRef, useState } from 'react'
import { SSE } from 'sse.js'

import { getFreshAuthHeaders } from '@/lib/api'

import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants'
import {
  getStreamReadyStateError,
  isStreamClosedReadyState,
  isStreamDoneMessage,
  parseStreamErrorDetails,
  parseStreamMessageUpdates,
} from '../lib'
import {
  getResponsesError,
  RESPONSES_STREAM_EVENTS,
} from '../lib/streaming/responses'
import type { PlaygroundRequest, ResponsesEvent } from '../types'

interface StreamEventSource {
  readyState?: number
  addEventListener: (
    type: string,
    listener: (event: Event & { data?: string; readyState?: number }) => void
  ) => void
  close: () => void
  stream: () => void
}

interface StreamRequestCallbacks {
  onResponseEvent?: (event: ResponsesEvent) => void
  onUpdate: (type: 'reasoning' | 'content', chunk: string) => void
  onComplete: () => void
  onError: (error: string, errorCode?: string) => void
}

interface StreamRequestControllerRuntime {
  getHeaders: () => Promise<Record<string, string>>
  createSource: (
    payload: PlaygroundRequest,
    headers: Record<string, string>
  ) => StreamEventSource
  setStreaming: (streaming: boolean) => void
}

export function createStreamRequestController(
  runtime: StreamRequestControllerRuntime
) {
  let source: StreamEventSource | null = null
  let generation = 0

  const closeActiveSource = (target: StreamEventSource) => {
    target.close()
    if (source === target) {
      source = null
      runtime.setStreaming(false)
    }
  }

  const send = async (
    payload: PlaygroundRequest,
    callbacks: StreamRequestCallbacks
  ) => {
    const requestGeneration = generation + 1
    generation = requestGeneration
    const previousSource = source
    source = null
    previousSource?.close()
    runtime.setStreaming(false)

    let headers: Record<string, string>
    try {
      headers = await runtime.getHeaders()
    } catch (error: unknown) {
      if (generation !== requestGeneration) return
      callbacks.onError(
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.STREAM_START_ERROR
      )
      return
    }
    if (generation !== requestGeneration) return

    const nextSource = runtime.createSource(payload, headers)
    source = nextSource
    runtime.setStreaming(true)
    let completed = false

    const isCurrent = () =>
      generation === requestGeneration && source === nextSource

    const handleError = (errorMessage: string, errorCode?: string) => {
      if (!isCurrent() || completed) return
      completed = true
      callbacks.onError(errorMessage, errorCode)
      closeActiveSource(nextSource)
    }

    const handleMessage = (event: Event & { data?: string }) => {
      if (!isCurrent() || completed) return
      const data = event.data ?? ''
      if (isStreamDoneMessage(data)) {
        if ('input' in payload) {
          handleError(ERROR_MESSAGES.CONNECTION_CLOSED)
          return
        }
        completed = true
        closeActiveSource(nextSource)
        callbacks.onComplete()
        return
      }

      try {
        if ('input' in payload) {
          const responseEvent = JSON.parse(data) as ResponsesEvent
          if (!responseEvent || typeof responseEvent.type !== 'string') {
            throw new Error('Invalid Responses event')
          }
          if (
            responseEvent.type === 'error' ||
            responseEvent.type === 'response.failed' ||
            responseEvent.type === 'response.incomplete'
          ) {
            handleError(
              responseEvent.message ||
                responseEvent.response?.error?.message ||
                (responseEvent.type === 'response.incomplete'
                  ? ERROR_MESSAGES.RESPONSE_INCOMPLETE
                  : ERROR_MESSAGES.API_REQUEST_ERROR),
              responseEvent.code || responseEvent.response?.error?.code
            )
            return
          }
          if (responseEvent.type === 'response.completed') {
            const responseError = responseEvent.response
              ? getResponsesError(responseEvent.response)
              : ERROR_MESSAGES.PARSE_ERROR
            if (responseError) {
              handleError(responseError)
              return
            }
            callbacks.onResponseEvent?.(responseEvent)
            completed = true
            closeActiveSource(nextSource)
            callbacks.onComplete()
            return
          }
          callbacks.onResponseEvent?.(responseEvent)
          return
        }
        const updates = parseStreamMessageUpdates(data)

        for (const update of updates) {
          callbacks.onUpdate(update.type, update.chunk)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse SSE message:', error)
        handleError(ERROR_MESSAGES.PARSE_ERROR)
      }
    }
    nextSource.addEventListener('message', handleMessage)
    if ('input' in payload) {
      for (const eventType of RESPONSES_STREAM_EVENTS) {
        nextSource.addEventListener(eventType, handleMessage)
      }
    }

    nextSource.addEventListener('error', (event) => {
      if (!isCurrent() || completed) return
      if ('input' in payload && event.data) {
        try {
          const parsed = JSON.parse(event.data) as ResponsesEvent
          if (parsed.type === 'error') {
            handleError(
              parsed.message || ERROR_MESSAGES.API_REQUEST_ERROR,
              parsed.code
            )
            return
          }
        } catch {
          // HTTP error bodies are handled by the existing request error parser.
        }
      }
      if (!isStreamClosedReadyState(nextSource.readyState)) {
        // eslint-disable-next-line no-console
        console.error('SSE Error:', event)
        const { errorCode, errorMessage } = parseStreamErrorDetails(event.data)
        handleError(errorMessage, errorCode)
      }
    })

    nextSource.addEventListener('readystatechange', (event) => {
      if (!isCurrent() || completed) return
      if ('input' in payload && isStreamClosedReadyState(event.readyState)) {
        handleError(ERROR_MESSAGES.CONNECTION_CLOSED)
        return
      }
      const errorMessage = getStreamReadyStateError(
        event.readyState,
        nextSource
      )

      if (errorMessage) {
        handleError(errorMessage)
      }
    })

    try {
      if (!isCurrent()) return
      nextSource.stream()
    } catch (error: unknown) {
      if (!isCurrent() || completed) return
      // eslint-disable-next-line no-console
      console.error('Failed to start SSE stream:', error)
      handleError(ERROR_MESSAGES.STREAM_START_ERROR)
    }
  }

  const cancel = (notify: boolean) => {
    generation += 1
    const activeSource = source
    source = null
    activeSource?.close()
    if (notify) runtime.setStreaming(false)
  }

  const stop = () => cancel(true)
  const dispose = () => cancel(false)

  return { send, stop, dispose }
}

/**
 * Hook for handling streaming chat completion requests
 */
export function useStreamRequest() {
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<ReturnType<
    typeof createStreamRequestController
  > | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = createStreamRequestController({
      getHeaders: getFreshAuthHeaders,
      createSource: (payload, headers) =>
        new SSE(
          'input' in payload
            ? API_ENDPOINTS.RESPONSES
            : API_ENDPOINTS.CHAT_COMPLETIONS,
          {
            headers,
            method: 'POST',
            payload: JSON.stringify(payload),
          }
        ) as StreamEventSource,
      setStreaming: setIsStreaming,
    })
  }

  const sendStreamRequest = useCallback(
    (
      payload: PlaygroundRequest,
      onUpdate: (type: 'reasoning' | 'content', chunk: string) => void,
      onComplete: () => void,
      onError: (error: string, errorCode?: string) => void,
      onResponseEvent?: (event: ResponsesEvent) => void
    ) =>
      controllerRef.current?.send(payload, {
        onUpdate,
        onComplete,
        onError,
        onResponseEvent,
      }),
    []
  )

  const stopStream = useCallback(() => {
    controllerRef.current?.stop()
  }, [])

  useEffect(
    () => () => {
      controllerRef.current?.dispose()
    },
    []
  )

  return {
    sendStreamRequest,
    stopStream,
    isStreaming,
  }
}
