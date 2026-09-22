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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { PlaygroundInput } from '../playground-input'

const props = {
  config: { ...DEFAULT_CONFIG, model: 'gpt-4o' },
  modelValue: 'gpt-4o',
  models: [{ value: 'gpt-4o', label: 'gpt-4o' }],
  onModelChange: vi.fn(),
  onSubmit: vi.fn(),
  onConfigChange: vi.fn(),
  onParameterEnabledChange: vi.fn(),
  parameterEnabled: DEFAULT_PARAMETER_ENABLED,
}
let blobs: Map<string, Blob>
const OriginalURL = URL
beforeEach(() => {
  blobs = new Map()
  vi.stubGlobal(
    'URL',
    class extends OriginalURL {
      static createObjectURL(blob: Blob) {
        const url = `blob:attachment-${blobs.size}`
        blobs.set(url, blob)
        return url
      }
      static revokeObjectURL(url: string) {
        blobs.delete(url)
      }
    }
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      blob: async () => {
        const blob = blobs.get(url)
        if (!blob) throw new Error('Revoked file')
        return blob
      },
    }))
  )
  vi.spyOn(toast, 'error').mockImplementation(() => 'error')
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function fileInput() {
  return screen.getByLabelText('Upload files') as HTMLInputElement
}

describe('Playground file input', () => {
  it('toggles search with empty input and selects Responses for search requests', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PlaygroundInput {...props} />)
    await user.click(
      screen.getByRole('button', { name: 'Search', pressed: false })
    )
    expect(props.onConfigChange).toHaveBeenCalledWith('apiMode', 'responses')
    expect(props.onConfigChange).toHaveBeenCalledWith('webSearch', true)
    rerender(
      <PlaygroundInput
        {...props}
        config={{ ...props.config, apiMode: 'responses', webSearch: true }}
      />
    )
    await user.click(
      screen.getByRole('button', { name: 'Search', pressed: true })
    )
    expect(props.onConfigChange).toHaveBeenCalledWith('webSearch', false)
    rerender(
      <PlaygroundInput
        {...props}
        config={{ ...props.config, apiMode: 'chat', webSearch: true }}
      />
    )
    expect(
      screen.getByRole('button', { name: 'Search', pressed: false })
    ).toBeEnabled()
  })

  it.each(['claude-sonnet-4-6', 'gpt-image-1'])(
    'disables search for %s',
    (model) => {
      render(
        <PlaygroundInput
          {...props}
          config={{
            ...props.config,
            model,
            webSearch: true,
            apiMode: 'responses',
          }}
        />
      )
      expect(
        screen.getByRole('button', { name: 'Search', pressed: false })
      ).toBeDisabled()
    }
  )

  it('opens the file picker directly from the attachment button with empty input', async () => {
    const user = userEvent.setup()
    render(<PlaygroundInput {...props} />)
    const click = vi.spyOn(fileInput(), 'click')
    await user.click(screen.getByRole('button', { name: 'Attach' }))
    expect(click).toHaveBeenCalledOnce()
    expect(fileInput().accept).toContain('.pdf')
  })
  it('submits a PDF without text and clears the selected attachment', async () => {
    const user = userEvent.setup()
    render(<PlaygroundInput {...props} />)
    await user.upload(
      fileInput(),
      new File(['pdf'], 'report.pdf', { type: 'application/pdf' })
    )
    expect(screen.getByText('report.pdf')).toBeVisible()
    await user.click(screen.getAllByRole('button', { name: /Send/ })[0])
    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith('', [
        {
          id: expect.any(String),
          filename: 'report.pdf',
          mediaType: 'application/pdf',
          url: 'data:application/pdf;base64,cGRm',
        },
      ])
    )
    await waitFor(() =>
      expect(screen.queryByText('report.pdf')).not.toBeInTheDocument()
    )
  })
  it('removes a selected file and disables attachment-only sending', async () => {
    const user = userEvent.setup()
    render(<PlaygroundInput {...props} />)
    await user.upload(
      fileInput(),
      new File(['text'], 'notes.txt', { type: 'text/plain' })
    )
    await user.click(screen.getByRole('button', { name: 'Remove attachment' }))
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: /Send/ })) {
      expect(button).toBeDisabled()
    }
  })
  it('rejects unsupported and oversized files without losing valid selections', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PlaygroundInput {...props} />)
    const huge = new File(['x'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(huge, 'size', { value: 5 * 1024 * 1024 + 1 })
    await user.upload(fileInput(), [
      new File(['text'], 'notes.txt', { type: 'text/plain' }),
      new File(['exe'], 'program.exe'),
      huge,
    ])
    expect(screen.getByText('notes.txt')).toBeVisible()
    expect(screen.queryByText('program.exe')).not.toBeInTheDocument()
    expect(screen.queryByText('huge.pdf')).not.toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledTimes(2)
  })
  it('keeps the file selected when reading fails and allows retry', async () => {
    const user = userEvent.setup()
    render(<PlaygroundInput {...props} />)
    await user.upload(
      fileInput(),
      new File(['text'], 'notes.txt', { type: 'text/plain' })
    )
    vi.mocked(fetch).mockRejectedValueOnce(new Error('read failed'))
    await user.click(screen.getAllByRole('button', { name: /Send/ })[0])
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Unable to read attachment. Please attach it again.'
      )
    )
    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('notes.txt')).toBeVisible()
    await user.click(screen.getAllByRole('button', { name: /Send/ })[0])
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledOnce())
  })
  it('retains attachments if switching to an image generation model prevents submission', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PlaygroundInput {...props} />)
    await user.upload(
      fileInput(),
      new File(['text'], 'notes.txt', { type: 'text/plain' })
    )
    rerender(
      <PlaygroundInput
        {...props}
        config={{ ...props.config, model: 'gpt-image-1' }}
      />
    )
    expect(screen.getByRole('button', { name: 'Attach' })).toBeDisabled()
    await user.click(screen.getAllByRole('button', { name: /Send/ })[0])
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Attachments require a chat model that supports the selected file type.'
      )
    )
    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('notes.txt')).toBeVisible()
  })
  it('does not submit attachments when disabled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PlaygroundInput {...props} />)
    await user.upload(
      fileInput(),
      new File(['text'], 'notes.txt', { type: 'text/plain' })
    )
    rerender(<PlaygroundInput {...props} disabled />)
    const form = screen.getByRole('textbox').closest('form')
    if (!form) throw new Error('Expected composer form')
    fireEvent.submit(form)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('notes.txt')).toBeVisible()
  })
})

it('keeps earlier attachments readable after adding another file', async () => {
  const user = userEvent.setup()
  render(<PlaygroundInput {...props} />)
  await user.upload(
    fileInput(),
    new File(['one'], 'one.txt', { type: 'text/plain' })
  )
  await user.upload(
    fileInput(),
    new File(['two'], 'two.txt', { type: 'text/plain' })
  )
  await user.click(screen.getAllByRole('button', { name: /Send/ })[0])
  await waitFor(() =>
    expect(props.onSubmit).toHaveBeenCalledWith('', [
      expect.objectContaining({ filename: 'one.txt', text: 'one' }),
      expect.objectContaining({ filename: 'two.txt', text: 'two' }),
    ])
  )
})
