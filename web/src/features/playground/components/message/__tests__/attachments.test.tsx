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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { prepareAttachments } from '../../../lib/input/attachments'
import { createUserMessage } from '../../../lib/message/message-utils'
import { MessageActions } from '../message-actions'
import { PlaygroundMessageContent } from '../playground-message-content'

describe('Attachment messages', () => {
  it('shows a photo preview and allows retrying an attachment-only message', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    const attachments = prepareAttachments([
      {
        type: 'file',
        filename: 'photo.png',
        mediaType: 'image/png',
        url: 'data:image/png;base64,aW1hZ2U=',
      },
    ])
    const message = createUserMessage('', 1, attachments)
    render(
      <PlaygroundMessageContent
        alignment='left'
        message={message}
        versionContent=''
        actions={
          <MessageActions
            message={message}
            alwaysVisible
            onRegenerate={retry}
          />
        }
      />
    )
    expect(screen.getByRole('img', { name: 'photo.png' })).toHaveAttribute(
      'src',
      attachments[0].url
    )
    expect(screen.getByText('photo.png')).toBeVisible()
    await user.click(screen.getAllByRole('button', { name: /Regenerate/ })[0])
    expect(retry).toHaveBeenCalledWith(message)
  })
  it('shows a recovery notice for attachments lost after reload', () => {
    const message = createUserMessage('')
    message.versions[0].attachmentsOmitted = true
    render(
      <PlaygroundMessageContent
        alignment='left'
        message={message}
        versionContent=''
        actions={<button type='button'>Delete</button>}
      />
    )
    expect(
      screen.getByText(
        'Attachments are no longer available. Remove this message and attach the files again, or clear the conversation.'
      )
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible()
  })
})
