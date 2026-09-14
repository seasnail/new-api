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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStatus } from '@/hooks/use-status'

export function ClaudeConfiguration(props: {
  apiKey: string
  modelName: string
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const configuredAddress =
    typeof status?.server_address === 'string'
      ? status.server_address.trim().replace(/\/+$/, '')
      : ''
  const serverAddress = configuredAddress || window.location.origin
  const apiKey = props.apiKey.startsWith('sk-')
    ? props.apiKey
    : `sk-${props.apiKey}`
  const configuration = JSON.stringify(
    {
      env: {
        ANTHROPIC_BASE_URL: serverAddress,
        ANTHROPIC_AUTH_TOKEN: apiKey,
        ANTHROPIC_MODEL: props.modelName,
      },
    },
    null,
    2
  )
  const platforms = [
    {
      id: 'windows',
      label: 'Windows',
      command:
        '$claudeDir = Join-Path $env:USERPROFILE ".claude"\n$settingsPath = Join-Path $claudeDir "settings.json"\nNew-Item -ItemType Directory -Force -Path $claudeDir | Out-Null\nif (-not (Test-Path $settingsPath)) { Set-Content -Path $settingsPath -Value "{}" }\nnotepad $settingsPath',
    },
    {
      id: 'macos',
      label: 'macOS',
      command:
        'mkdir -p ~/.claude && touch ~/.claude/settings.json\nopen -e ~/.claude/settings.json',
    },
    {
      id: 'linux',
      label: 'Linux',
      command:
        'mkdir -p ~/.claude && touch ~/.claude/settings.json\n${EDITOR:-nano} ~/.claude/settings.json',
    },
  ]

  return (
    <div className='space-y-4'>
      <p className='text-muted-foreground text-sm'>
        {t('Quit Claude Code before editing its settings.')}
      </p>
      <Tabs defaultValue='windows'>
        <TabsList aria-label={t('Operating system')}>
          {platforms.map((platform) => (
            <TabsTrigger key={platform.id} value={platform.id}>
              {platform.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {platforms.map((platform) => (
          <TabsContent
            key={platform.id}
            value={platform.id}
            className='space-y-2'
          >
            <p className='text-sm'>
              {t('Open the Claude Code settings file with these commands.')}
            </p>
            <div className='bg-muted/40 relative rounded-lg border'>
              <pre className='overflow-x-auto p-3 pr-12 text-xs'>
                <code>{platform.command}</code>
              </pre>
              <CopyButton
                value={platform.command}
                aria-label={t('Copy file commands')}
                className='absolute top-2 right-2'
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Merge this configuration into ~/.claude/settings.json, preserving existing settings.'
        )}
      </p>
      <div className='bg-muted/40 relative rounded-lg border'>
        <pre className='overflow-x-auto p-3 pr-12 text-xs'>
          <code>{configuration}</code>
        </pre>
        <CopyButton
          value={configuration}
          aria-label={t('Copy configuration')}
          className='absolute top-2 right-2'
        />
      </div>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Save the file, then run claude in a new terminal to restart Claude Code.'
        )}
      </p>
    </div>
  )
}
