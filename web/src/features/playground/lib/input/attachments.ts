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
import type { FileUIPart } from 'ai'
import { nanoid } from 'nanoid'

import type { PlaygroundAttachment } from '../../types'

export const ATTACHMENT_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.csv,.json,image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json'
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
export const MAX_ATTACHMENTS = 4

// Normalize picker, paste and drop inputs before they enter conversation history.
export function prepareAttachments(
  files: FileUIPart[]
): PlaygroundAttachment[] {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error('Too many files. Some were not added.')
  }
  return files.map((file) => {
    const filename = file.filename || 'attachment'
    const extension = filename.split('.').pop()?.toLowerCase()
    const types: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      csv: 'text/csv',
      json: 'application/json',
    }
    const mediaType =
      file.mediaType && file.mediaType !== 'application/octet-stream'
        ? file.mediaType
        : types[extension ?? '']
    if (!mediaType || !Object.values(types).includes(mediaType)) {
      throw new Error(
        'Supported files: PNG, JPEG, WebP, GIF, PDF, TXT, Markdown, CSV and JSON.'
      )
    }
    const match = /^data:[^,]*;base64,([A-Za-z0-9+/]*={0,2})$/.exec(file.url)
    if (!match) {
      throw new Error('Unable to read attachment. Please attach it again.')
    }
    const encoded = match[1]
    if (encoded.length > Math.ceil(MAX_ATTACHMENT_SIZE / 3) * 4) {
      throw new Error('All files exceed the maximum size.')
    }
    const binary = atob(encoded)
    if (binary.length > MAX_ATTACHMENT_SIZE) {
      throw new Error('All files exceed the maximum size.')
    }
    const attachment: PlaygroundAttachment = {
      id: nanoid(),
      filename,
      mediaType,
      url: `data:${mediaType};base64,${encoded}`,
    }
    if (mediaType.startsWith('text/') || mediaType === 'application/json') {
      try {
        attachment.text = new TextDecoder('utf-8', { fatal: true }).decode(
          Uint8Array.from(binary, (character) => character.charCodeAt(0))
        )
      } catch {
        throw new Error('Unable to read attachment. Please attach it again.')
      }
    }
    return attachment
  })
}
