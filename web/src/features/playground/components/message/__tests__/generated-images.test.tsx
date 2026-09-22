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

import { PlaygroundMessageContent } from '../playground-message-content'

describe('generated image replies', () => {
  test('renders an image-only response with a download link and message actions', () => {
    render(
      <PlaygroundMessageContent
        alignment='left'
        actions={<button type='button'>Retry</button>}
        versionContent=''
        message={{
          key: 'reply',
          from: 'assistant',
          status: 'complete',
          versions: [
            {
              id: 'v1',
              content: '',
              images: [
                { id: 'img_1', result: 'aGVsbG8=', output_format: 'png' },
              ],
            },
          ],
        }}
      />
    )
    expect(
      screen.getByRole('img', { name: 'Generated image 1' })
    ).toHaveAttribute('src', 'data:image/png;base64,aGVsbG8=')
    expect(
      screen.getByRole('link', { name: 'Download image 1' })
    ).toHaveAttribute('download', 'generated-image-1.png')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
    expect(screen.queryByText('Responding...')).not.toBeInTheDocument()
  })

  test('shows a clear placeholder after refresh instead of a blank image reply', () => {
    render(
      <PlaygroundMessageContent
        alignment='left'
        actions={null}
        versionContent=''
        message={{
          key: 'reply',
          from: 'assistant',
          status: 'complete',
          versions: [{ id: 'v1', content: '', imagesOmitted: true }],
        }}
      />
    )
    expect(
      screen.getByText(
        'Images from this response were not saved. Generate them again to view them.'
      )
    ).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
