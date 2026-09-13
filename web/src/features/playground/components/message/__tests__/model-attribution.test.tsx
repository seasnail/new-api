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
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { messagesSchema } from '../../../lib/storage/storage-schema'
import type { Message } from '../../../types'
import { PlaygroundMessageContent } from '../playground-message-content'

const reply: Message = {
  key: 'reply',
  from: 'assistant',
  model: 'gpt-4.1',
  versions: [{ id: 'version', content: '' }],
  status: 'complete',
}

describe('reply model attribution', () => {
  test.each(['loading', 'streaming', 'complete'] as const)(
    'shows the saved model while the reply is %s',
    (status) => {
      render(
        <PlaygroundMessageContent
          actions={null}
          alignment='left'
          message={{ ...reply, status }}
          versionContent=''
        />
      )
      expect(screen.getByText('gpt-4.1')).toBeInTheDocument()
    }
  )

  test('does not attribute user messages or old replies without a saved model', () => {
    const { rerender } = render(
      <PlaygroundMessageContent
        actions={null}
        alignment='left'
        message={{ ...reply, from: 'user' }}
        versionContent=''
      />
    )
    expect(screen.queryByText('gpt-4.1')).not.toBeInTheDocument()
    rerender(
      <PlaygroundMessageContent
        actions={null}
        alignment='left'
        message={{ ...reply, model: undefined }}
        versionContent=''
      />
    )
    expect(screen.queryByText('gpt-4.1')).not.toBeInTheDocument()
  })

  test('preserves individual model names through stored message serialization', () => {
    const messages = [
      reply,
      { ...reply, key: 'second', model: 'claude-sonnet-4' },
    ]
    expect(messagesSchema.parse(JSON.parse(JSON.stringify(messages)))).toEqual(
      messages
    )
    expect(
      messagesSchema.parse([{ ...reply, model: undefined }])[0].model
    ).toBeUndefined()
  })
})
