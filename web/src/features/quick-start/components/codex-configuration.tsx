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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStatus } from '@/hooks/use-status'

type CodexConfigurationProps = {
  apiKey: string
  embedded?: boolean
  modelName: string
}

type Platform = 'windows' | 'macos' | 'linux'

const PLATFORM_DETAILS: Record<
  Platform,
  {
    labelKey: string
    openCommand: string
    path: string
    profile: string
    stopCommand: string
  }
> = {
  windows: {
    labelKey: 'Windows',
    path: '%USERPROFILE%\\.codex\\config.toml',
    openCommand:
      '$codexDir = Join-Path $env:USERPROFILE ".codex"\n$configPath = Join-Path $codexDir "config.toml"\nNew-Item -ItemType Directory -Force -Path $codexDir | Out-Null\nif (-not (Test-Path $configPath)) { New-Item -ItemType File -Path $configPath | Out-Null }\nnotepad $configPath',
    profile: 'PowerShell',
    stopCommand:
      'Get-Process -Name "Codex" -ErrorAction SilentlyContinue | Stop-Process -Force',
  },
  macos: {
    labelKey: 'macOS',
    path: '~/.codex/config.toml',
    openCommand:
      'mkdir -p ~/.codex && touch ~/.codex/config.toml\nopen -e ~/.codex/config.toml',
    profile: '~/.zshrc',
    stopCommand:
      'pkill -x Codex 2>/dev/null || true\npkill -x codex 2>/dev/null || true',
  },
  linux: {
    labelKey: 'Linux',
    path: '~/.codex/config.toml',
    openCommand:
      'mkdir -p ~/.codex && touch ~/.codex/config.toml\n${EDITOR:-nano} ~/.codex/config.toml',
    profile: '~/.bashrc',
    stopCommand:
      'pkill -x Codex 2>/dev/null || true\npkill -x codex 2>/dev/null || true',
  },
}

function CommandBlock(props: { code: string; label: string }) {
  return (
    <div className='bg-muted/40 relative overflow-hidden rounded-lg border'>
      <div className='border-b px-3 py-2 text-xs font-medium'>
        {props.label}
      </div>
      <pre className='overflow-x-auto p-3 pr-12 font-mono text-xs leading-relaxed'>
        <code>{props.code}</code>
      </pre>
      <CopyButton
        value={props.code}
        className='absolute top-9 right-2'
        aria-label={props.label}
      />
    </div>
  )
}

export function CodexConfiguration(props: CodexConfigurationProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const configuredAddress =
    typeof status?.server_address === 'string'
      ? status.server_address.trim().replace(/\/+$/, '')
      : ''
  const serverAddress =
    configuredAddress ||
    (typeof window === 'undefined' ? '' : window.location.origin)
  const apiKey = props.apiKey.startsWith('sk-')
    ? props.apiKey
    : `sk-${props.apiKey}`
  const config = `model = ${JSON.stringify(props.modelName)}\nmodel_provider = "one-gateway"\n\n[model_providers.one-gateway]\nname = "One Gateway"\nbase_url = ${JSON.stringify(`${serverAddress}/v1`)}\nenv_key = "ONE_GATEWAY_KEY"\nwire_api = "responses"`

  const environmentCommand = (platform: Platform) => {
    if (platform === 'windows') {
      return `[Environment]::SetEnvironmentVariable("ONE_GATEWAY_KEY", "${apiKey}", "User")`
    }

    const profile = PLATFORM_DETAILS[platform].profile
    return `echo 'export ONE_GATEWAY_KEY="${apiKey}"' >> ${profile}\nsource ${profile}`
  }

  const instructions = (
    <Tabs defaultValue='windows'>
      <TabsList aria-label={t('Operating system')}>
        {(Object.keys(PLATFORM_DETAILS) as Platform[]).map((platform) => (
          <TabsTrigger key={platform} value={platform}>
            {t(PLATFORM_DETAILS[platform].labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(PLATFORM_DETAILS) as Platform[]).map((platform) => {
        const details = PLATFORM_DETAILS[platform]
        return (
          <TabsContent key={platform} value={platform} className='mt-4'>
            <ol className='space-y-6'>
              <li className='space-y-2'>
                <h3 className='font-medium'>1. {t('Close Codex')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Quit Codex and stop any remaining background processes before changing the configuration.'
                  )}
                </p>
                <CommandBlock
                  code={details.stopCommand}
                  label={t('Copy stop command')}
                />
              </li>

              <li className='space-y-2'>
                <h3 className='font-medium'>
                  2. {t('Open the Codex config file')}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Run these commands in {{terminal}} to create the config file if needed and open it.',
                    {
                      terminal:
                        details.profile === 'PowerShell'
                          ? 'PowerShell'
                          : t('Terminal'),
                    }
                  )}{' '}
                  <code className='bg-muted rounded px-1 py-0.5 text-xs'>
                    {details.path}
                  </code>
                </p>
                <CommandBlock
                  code={details.openCommand}
                  label={t('Copy file commands')}
                />
              </li>

              <li className='space-y-2'>
                <h3 className='font-medium'>
                  3. {t('Add the provider configuration')}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Paste this into config.toml. If the file already has settings, merge these values instead of replacing the file.'
                  )}
                </p>
                <CommandBlock code={config} label={t('Copy configuration')} />
              </li>

              <li className='space-y-2'>
                <h3 className='font-medium'>4. {t('Set the API key')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Store the API key in an environment variable; do not paste it into config.toml.'
                  )}
                </p>
                <CommandBlock
                  code={environmentCommand(platform)}
                  label={t('Copy environment command')}
                />
              </li>

              <li className='space-y-2'>
                <h3 className='font-medium'>5. {t('Restart Codex')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Open a new terminal after saving the environment variable, then restart Codex.'
                  )}
                </p>
                <CommandBlock code='codex' label={t('Copy command')} />
              </li>
            </ol>
          </TabsContent>
        )
      })}
    </Tabs>
  )

  if (props.embedded) {
    return instructions
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Configure Codex to use this API key')}</CardTitle>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Connect Codex to this service with the API key and model you selected.'
          )}
        </p>
      </CardHeader>
      <CardContent>{instructions}</CardContent>
    </Card>
  )
}
