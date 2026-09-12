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
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { server_address: 'https://api.test' } }),
}))

vi.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: (props: { code: string; children?: ReactNode }) => (
    <pre data-testid='code-sample'>
      {props.code}
      {props.children}
    </pre>
  ),
  CodeBlockCopyButton: () => null,
}))

const { ModelDetailsApi } = await import('../model-details-api')

const model = {
  id: 1,
  model_name: 'gpt-test',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 1,
  enable_groups: ['default'],
  supported_endpoint_types: ['openai', 'openai-response'],
}

describe('ModelDetailsApi API key samples', () => {
  test('embeds a supplied API key in the default cURL sample', () => {
    render(
      <ModelDetailsApi
        model={model}
        endpointMap={{
          openai: { path: '/v1/chat/completions' },
          'openai-response': { path: '/v1/responses' },
        }}
        apiKey='sk-created-key'
      />
    )

    expect(screen.getByTestId('code-sample')).toHaveTextContent(
      'Authorization: Bearer sk-created-key'
    )
    expect(screen.getByTestId('code-sample')).not.toHaveTextContent(
      '$NEW_API_KEY'
    )
    expect(screen.getByTestId('code-sample')).toHaveTextContent(
      '/v1/chat/completions'
    )
    expect(screen.queryByText('<YOUR_API_KEY>')).not.toBeInTheDocument()
  })
})
