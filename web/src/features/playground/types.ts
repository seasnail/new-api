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
// Message types
export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'loading' | 'streaming' | 'complete' | 'error'

export type PlaygroundMessageLayoutMode = 'alternating' | 'left'

export interface MessageVersion {
  id: string
  content: string
  images?: GeneratedImage[]
  imagesOmitted?: boolean
  attachments?: PlaygroundAttachment[]
  attachmentsOmitted?: boolean
}

export interface PlaygroundAttachment {
  id: string
  filename: string
  mediaType: string
  url: string
  text?: string
}

export type ResponsesInputPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'input_file'; filename: string; file_data: string }

export interface GeneratedImage {
  source?: 'images'
  id: string
  result: string
  output_format: 'png' | 'jpeg' | 'webp'
}

export type ResponsesInputItem =
  | { role: MessageRole; content: string }
  | { role: 'user'; content: ResponsesInputPart[] }

export interface ResponsesRequest {
  model: string
  group?: string
  input: ResponsesInputItem[]
  stream: boolean
  store: false
  temperature?: number
  top_p?: number
  max_output_tokens?: number
  tools?: (
    | { type: 'image_generation'; model?: string; output_format: 'png' }
    | { type: 'web_search' }
  )[]
}

export type PlaygroundRequest = ChatCompletionRequest | ResponsesRequest

export interface ImageGenerationRequest {
  model: string
  group: string
  prompt: string
  n: 1
  output_format: 'png'
}

export interface ImageGenerationResponse {
  data?: { b64_json?: string }[]
  output_format?: string
  error?: { message?: string }
}

export interface ResponsesOutputItem {
  type: string
  id?: string
  status?: string
  result?: string | null
  output_format?: string
  content?: {
    type: string
    text?: string
    refusal?: string
    annotations?: { type: string; url?: string; title?: string }[]
  }[]
  summary?: { type: string; text?: string }[]
}

export interface ResponsesResponse {
  status: string
  output: ResponsesOutputItem[]
  error?: { message?: string; code?: string } | null
  incomplete_details?: { reason?: string } | null
}

export interface ResponsesEvent {
  type: string
  delta?: string
  item?: ResponsesOutputItem
  response?: ResponsesResponse
  message?: string
  code?: string
}

export interface Message {
  key: string
  from: MessageRole
  model?: string
  versions: MessageVersion[]
  createdAt?: number
  startedAt?: number
  completedAt?: number
  durationMs?: number
  sources?: { href: string; title: string }[]
  reasoning?: {
    content: string
    duration: number
    startedAt?: number
    completedAt?: number
    durationMs?: number
  }
  isReasoningStreaming?: boolean
  isReasoningComplete?: boolean
  isContentComplete?: boolean
  status?: MessageStatus
  errorCode?: string | null
}

// API payload types
export interface ChatCompletionMessage {
  role: MessageRole
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url' | 'file'
  file?: { filename: string; file_data: string }
  text?: string
  image_url?: {
    url: string
  }
}

export interface ChatCompletionRequest {
  model: string
  group?: string
  messages: ChatCompletionMessage[]
  stream: boolean
  temperature?: number
  top_p?: number
  max_tokens?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
}

export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: MessageRole
      content?: string
      reasoning_content?: string
    }
    finish_reason: string | null
  }>
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: MessageRole
      content: string
      reasoning_content?: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Configuration types
export interface PlaygroundConfig {
  webSearch?: boolean
  apiMode?: 'chat' | 'responses'
  imageGeneration?: boolean
  imageModel?: string
  model: string
  group: string
  temperature: number
  top_p: number
  max_tokens: number
  frequency_penalty: number
  presence_penalty: number
  seed: number | null
  stream: boolean
}

export interface ParameterEnabled {
  temperature: boolean
  top_p: boolean
  max_tokens: boolean
  frequency_penalty: boolean
  presence_penalty: boolean
  seed: boolean
}

// Model options
export interface ModelOption {
  label: string
  value: string
}
