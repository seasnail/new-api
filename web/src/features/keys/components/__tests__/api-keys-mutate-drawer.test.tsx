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
import { afterEach, describe, expect, test, vi } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/api')
const { ApiKeysProvider } = await import('../api-keys-provider')
const { ApiKeysMutateDrawer } = await import('../api-keys-mutate-drawer')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

type ApiMethod = (url: string, data?: unknown) => Promise<{ data: unknown }>
type MockableApi = {
  get: ApiMethod
  post: ApiMethod
}
type RenderedDrawer = {
  queryClient: InstanceType<typeof QueryClient>
}

const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
const originalPost = apiClient.post
let renderedDrawer: RenderedDrawer | null = null

function installApiFixtures(createdPayloads: Array<Record<string, unknown>>) {
  apiClient.get = async (url) => {
    switch (url) {
      case '/api/status':
        return { data: { data: { default_use_auto_group: true } } }
      case '/api/user/models':
        return { data: { success: true, data: ['gpt-4o', 'claude-sonnet'] } }
      case '/api/user/self/groups':
        return {
          data: {
            success: true,
            data: {
              auto: { desc: 'Automatic routing', ratio: 'auto' },
              default: { desc: 'Standard access', ratio: 1 },
              vip: { desc: 'Priority access', ratio: 2 },
            },
          },
        }
      case '/api/token/auto-groups':
        return {
          data: {
            success: true,
            data: { groups: ['vip', 'default'], max_count: 3 },
          },
        }
      case '/api/token/42':
        return {
          data: {
            success: true,
            data: {
              id: 42,
              name: 'existing-key',
              key: 'existing-key-value',
              status: 1,
              remain_quota: 0,
              used_quota: 0,
              unlimited_quota: true,
              expired_time: -1,
              created_time: 1,
              accessed_time: 1,
              group: '',
              auto_groups: null,
              cross_group_retry: false,
              model_limits_enabled: false,
              model_limits: '',
              allow_ips: '',
            },
          },
        }
      case '/api/token/?p=1&size=1':
        return {
          data: {
            success: true,
            data: {
              items: [
                {
                  id: 42,
                  name: 'onboarding-key',
                  key: 'abcd...wxyz',
                  status: 1,
                  remain_quota: 0,
                  used_quota: 0,
                  unlimited_quota: true,
                  expired_time: -1,
                  created_time: 1,
                  accessed_time: 1,
                  group: 'auto',
                  auto_groups: null,
                  cross_group_retry: true,
                  model_limits_enabled: false,
                  model_limits: '',
                  allow_ips: '',
                },
              ],
              total: 1,
              page: 1,
              page_size: 1,
            },
          },
        }
      default:
        throw new Error(`Unexpected GET ${url}`)
    }
  }
  apiClient.post = async (url, data) => {
    expect(url).toBe('/api/token/')
    expect(data && typeof data === 'object').toBeTruthy()
    const payload = data as Record<string, unknown>
    createdPayloads.push(payload)
    return {
      data: {
        success: true,
        data: {
          ...payload,
          id: 42,
          key: 'plain-created-key',
          status: 1,
          used_quota: 0,
          created_time: 1,
          accessed_time: 1,
          auto_groups: null,
        },
      },
    }
  }
}

async function renderCreateDrawer(options?: {
  embedded?: boolean
  onCreated?: (apiKey: import('../../types').ApiKey) => void
  currentRow?: import('../../types').ApiKey
}): Promise<void> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const freshAt = Date.now() + 60_000
  queryClient.setQueryData(
    ['status'],
    { default_use_auto_group: true },
    { updatedAt: freshAt }
  )
  queryClient.setQueryData(
    ['user-models'],
    { success: true, data: ['gpt-4o', 'claude-sonnet'] },
    { updatedAt: freshAt }
  )
  queryClient.setQueryData(
    ['user-groups'],
    {
      success: true,
      data: {
        auto: { desc: 'Automatic routing', ratio: 'auto' },
        default: { desc: 'Standard access', ratio: 1 },
        vip: { desc: 'Priority access', ratio: 2 },
      },
    },
    { updatedAt: freshAt }
  )
  queryClient.setQueryData(
    ['token-auto-groups'],
    {
      success: true,
      data: { groups: ['vip', 'default'], max_count: 3 },
    },
    { updatedAt: freshAt }
  )
  renderedDrawer = { queryClient }

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ApiKeysProvider>
          <ApiKeysMutateDrawer
            open
            embedded={options?.embedded}
            currentRow={options?.currentRow}
            onOpenChange={() => undefined}
            onCreated={options?.onCreated}
          />
        </ApiKeysProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
  await waitFor(
    () => {
      const saveButton = findButton(
        options?.embedded ? 'Create API Key and continue' : 'Save changes',
        false
      )
      expect(saveButton).toBeEnabled()
    },
    { timeout: 1500 }
  )
}

function findButton(text: string, required: true): HTMLButtonElement
function findButton(text: string, required: false): HTMLButtonElement | null
function findButton(text: string, required = true): HTMLButtonElement | null {
  const button = screen
    .queryAllByRole<HTMLButtonElement>('button')
    .find((candidate) => candidate.textContent?.includes(text))
  if (required && !button) {
    throw new Error(`Expected button containing "${text}"`)
  }
  return button ?? null
}

function getControlByLabel(labelText: 'Name' | 'Quantity'): HTMLInputElement
function getControlByLabel(labelText: string): HTMLElement {
  const label = [...document.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === labelText
  )
  if (!label) {
    throw new Error(`Expected label "${labelText}"`)
  }

  const control =
    label.control ??
    label
      .closest('[data-slot="form-item"]')
      ?.querySelector<HTMLElement>(
        '[data-slot="form-control"], input, textarea, button[role="combobox"], [role="group"]'
      )
  if (!control) {
    throw new Error(`Expected control for label "${labelText}"`)
  }
  return control
}

function changeInput(input: HTMLInputElement, value: string): void {
  fireEvent.input(input, { target: { value } })
}

afterEach(() => {
  apiClient.get = originalGet
  apiClient.post = originalPost
  localStorage.clear()
  if (renderedDrawer) {
    renderedDrawer.queryClient.clear()
    renderedDrawer = null
  }
})

describe('API keys mutate drawer create group behavior', () => {
  test('renders the create form as an embedded panel and reports the created key', async () => {
    const createdPayloads: Array<Record<string, unknown>> = []
    const onCreated = vi.fn()
    installApiFixtures(createdPayloads)
    await renderCreateDrawer({ embedded: true, onCreated })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
    expect(screen.queryByText('Quota Settings')).not.toBeInTheDocument()
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
    expect(screen.getByText('Available Model List')).toBeVisible()
    expect(screen.getByText('gpt-4o')).toBeVisible()
    expect(screen.getByText('claude-sonnet')).toBeVisible()
    const advancedTrigger = screen.getByRole('button', {
      name: /Advanced Settings/,
    })
    expect(advancedTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByText('IP Whitelist (supports CIDR)')
    ).not.toBeInTheDocument()
    fireEvent.click(advancedTrigger)
    expect(advancedTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('IP Whitelist (supports CIDR)')).toBeVisible()
    const quantityLabel = screen.getByText('Quantity', { selector: 'label' })
    const modelLimitsLabel = screen.getByText('Available Model List', {
      selector: 'label',
    })
    const advancedHeading = screen.getByText('Advanced Settings')
    const expirationLabel = screen.getByText('Expiration Time', {
      selector: 'label',
    })
    expect(
      quantityLabel.compareDocumentPosition(modelLimitsLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    expect(
      advancedHeading.compareDocumentPosition(expirationLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)

    const unlimitedQuotaSwitch = screen.getByRole('switch', {
      name: 'Unlimited Quota',
    })
    expect(
      advancedHeading.compareDocumentPosition(unlimitedQuotaSwitch) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    fireEvent.click(unlimitedQuotaSwitch)
    const quotaLabel = screen.getByText(/Quota \(/, { selector: 'label' })
    expect(
      unlimitedQuotaSwitch.compareDocumentPosition(quotaLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    expect(
      screen.queryByRole('button', { name: 'Group' })
    ).not.toBeInTheDocument()
    expect(
      [...document.querySelectorAll('label')].some(
        (label) => label.textContent?.trim() === 'Group'
      )
    ).toBe(false)

    changeInput(getControlByLabel('Name'), 'onboarding-key')
    fireEvent.click(findButton('Create API Key and continue', true))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({
      id: 42,
      name: 'onboarding-key',
      key: 'plain-created-key',
    })
    expect(createdPayloads).toHaveLength(1)
    expect(createdPayloads[0]?.group).toBe('')
    expect(createdPayloads[0]?.model_limits_enabled).toBe(true)
    expect(createdPayloads[0]?.model_limits).toBe('gpt-4o,claude-sonnet')
    expect(createdPayloads[0]?.auto_groups).toEqual([])
    expect(createdPayloads[0]?.cross_group_retry).toBe(false)
  })

  test('hides group selection and uses the default group for every batch-created key', async () => {
    const createdPayloads: Array<Record<string, unknown>> = []
    installApiFixtures(createdPayloads)
    await renderCreateDrawer()

    expect(
      [...document.querySelectorAll('label')].some(
        (label) => label.textContent?.trim() === 'Group'
      )
    ).toBe(false)
    expect(screen.queryByRole('button', { name: 'Group' })).toBeNull()
    expect(document.body.textContent).not.toContain('Auto group order')

    const modelChip = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="combobox-chip"]'),
    ].find((item) => item.textContent?.includes('gpt-4o'))
    const removeModelButton = modelChip?.querySelector<HTMLButtonElement>(
      '[data-slot="combobox-chip-remove"]'
    )
    if (!removeModelButton) {
      throw new Error('Expected gpt-4o remove button')
    }
    fireEvent.click(removeModelButton)

    changeInput(getControlByLabel('Name'), 'batch')
    changeInput(getControlByLabel('Quantity'), '2')
    fireEvent.click(findButton('Save changes', true))
    await waitFor(() => expect(createdPayloads).toHaveLength(2))

    expect(createdPayloads.length).toBe(2)
    expect(createdPayloads[0]?.name).toBe('batch')
    for (const payload of createdPayloads) {
      expect(payload.group).toBe('')
      expect(payload.auto_groups).toEqual([])
      expect(payload.cross_group_retry).toBe(false)
      expect(payload.model_limits_enabled).toBe(true)
      expect(payload.model_limits).toBe('claude-sonnet')
    }
  })

  test('expands advanced settings by default when editing an API key', async () => {
    installApiFixtures([])
    await renderCreateDrawer({
      currentRow: {
        id: 42,
        name: 'existing-key',
        key: 'existing-key-value',
        status: 1,
        remain_quota: 0,
        used_quota: 0,
        unlimited_quota: true,
        expired_time: -1,
        created_time: 1,
        accessed_time: 1,
        group: '',
        auto_groups: null,
        cross_group_retry: false,
        model_limits_enabled: false,
        model_limits: '',
        allow_ips: '',
      },
    })

    const advancedTrigger = screen.getByRole('button', {
      name: /Advanced Settings/,
    })
    expect(advancedTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Expiration Time')).toBeVisible()
    expect(screen.getByText('Unlimited Quota')).toBeVisible()
    expect(
      [...document.querySelectorAll('label')].some(
        (label) => label.textContent?.trim() === 'Group'
      )
    ).toBe(false)
  })
})
