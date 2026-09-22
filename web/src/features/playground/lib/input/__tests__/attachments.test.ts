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
import { beforeEach, afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import {
  appendUserMessagePair,
  applyMessageEdit,
  createRegeneratedMessages,
} from '../../message/conversation-message-utils'
import { loadMessages, saveMessages } from '../../storage/storage'
import { buildChatCompletionPayload } from '../../streaming/payload-builder'
import { buildResponsesPayload } from '../../streaming/responses'
import { MAX_ATTACHMENT_SIZE, prepareAttachments } from '../attachments'

const files = [
  {
    type: 'file' as const,
    filename: 'diagram.png',
    mediaType: 'image/png',
    url: 'data:image/png;base64,aW1hZ2U=',
  },
  {
    type: 'file' as const,
    filename: 'report.pdf',
    mediaType: 'application/pdf',
    url: 'data:application/pdf;base64,cGRm',
  },
  {
    type: 'file' as const,
    filename: 'notes.txt',
    mediaType: '',
    url: 'data:application/octet-stream;base64,SGVsbG8=',
  },
]

describe('Playground attachments', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('sends image, PDF and decoded text content in Chat Completions', () => {
    const messages = appendUserMessagePair(
      [],
      'Read these',
      prepareAttachments(files)
    )
    expect(
      buildChatCompletionPayload(
        messages,
        DEFAULT_CONFIG,
        DEFAULT_PARAMETER_ENABLED
      ).messages
    ).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Read these' },
          { type: 'image_url', image_url: { url: files[0].url } },
          {
            type: 'file',
            file: { filename: 'report.pdf', file_data: files[1].url },
          },
          { type: 'text', text: 'notes.txt\nHello' },
        ],
      },
    ])
  })

  it('sends attachment-only messages in Responses', () => {
    const messages = appendUserMessagePair([], '', prepareAttachments(files))
    expect(
      buildResponsesPayload(messages, DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED)
        .input
    ).toEqual([
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: files[0].url },
          {
            type: 'input_file',
            filename: 'report.pdf',
            file_data: files[1].url,
          },
          { type: 'input_text', text: 'notes.txt\nHello' },
        ],
      },
    ])
  })

  it('keeps attachments when editing or regenerating a message', () => {
    const attachments = prepareAttachments(files)
    const messages = appendUserMessagePair([], 'Original', attachments)
    const edited = applyMessageEdit(messages, messages[0].key, 'Changed', true)
    expect(edited).not.toBeNull()
    if (!edited) throw new Error('Expected edit result')
    const regenerated = createRegeneratedMessages(
      edited.messages,
      edited.messages[1].key
    )
    expect(regenerated).not.toBeNull()
    if (!regenerated) throw new Error('Expected regenerated messages')
    expect(regenerated[0].versions[0]).toMatchObject({
      content: 'Changed',
      attachments,
    })
  })

  it('stores a missing-attachment notice without persisting file data', () => {
    const messages = appendUserMessagePair([], '', prepareAttachments(files))
    saveMessages(messages)
    expect(loadMessages()?.[0].versions[0]).toMatchObject({
      content: '',
      attachmentsOmitted: true,
    })
    expect(loadMessages()?.[0].versions[0].attachments).toBeUndefined()
    expect(JSON.stringify(localStorage)).not.toContain('base64')
    expect(messages[0].versions[0].attachments).toHaveLength(3)
  })

  it.each([
    { ...files[0], mediaType: 'image/svg+xml', filename: 'unsafe.svg' },
    { ...files[0], url: 'blob:unreadable' },
    { ...files[2], url: 'data:text/plain;base64,/w==' },
  ])(
    'rejects unsupported or unreadable attachments: $filename $url',
    (file) => {
      expect(() => prepareAttachments([file])).toThrow()
    }
  )

  it('rejects excessive count and size before building requests', () => {
    expect(() =>
      prepareAttachments(Array.from({ length: 5 }, () => files[0]))
    ).toThrow('Too many files')
    expect(() =>
      prepareAttachments([
        {
          ...files[0],
          url: `data:image/png;base64,${'A'.repeat(Math.ceil(MAX_ATTACHMENT_SIZE / 3) * 4 + 4)}`,
        },
      ])
    ).toThrow('maximum size')
  })

  it('decodes UTF-8 text and preserves its filename', () => {
    expect(
      prepareAttachments([
        { ...files[2], url: 'data:text/plain;base64,5L2g5aW9' },
      ])[0]
    ).toMatchObject({ filename: 'notes.txt', text: '你好' })
  })
})
