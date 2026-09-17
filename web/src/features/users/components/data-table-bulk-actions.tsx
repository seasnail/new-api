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
import type { Table } from '@tanstack/react-table'
import { PowerOff, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'

import { deleteUser, manageUser } from '../api'
import { ERROR_MESSAGES, USER_ROLE, isUserDeleted } from '../constants'
import type { User } from '../types'
import { useUsers } from './users-provider'

type BulkAction = 'disable' | 'delete'
type UserResult = {
  id: number
  username: string
  success: boolean
  message?: string
}

interface DataTableBulkActionsProps {
  table: Table<User>
}

export function DataTableBulkActions(props: DataTableBulkActionsProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useUsers()
  const [pending, setPending] = useState<{
    action: BulkAction
    users: User[]
  } | null>(null)
  const [results, setResults] = useState<UserResult[] | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const running = useRef(false)
  const selected = props.table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original)
  const unavailable =
    selected.length === 0 ||
    selected.some((user) => isUserDeleted(user) || user.role === USER_ROLE.ROOT)

  const handleConfirm = async () => {
    if (!pending || running.current || results) return
    running.current = true
    setIsRunning(true)
    const completed: UserResult[] = []
    try {
      for (const user of pending.users) {
        try {
          const result =
            pending.action === 'delete'
              ? await deleteUser(user.id)
              : await manageUser(user.id, 'disable')
          completed.push({
            id: user.id,
            username: user.username,
            success: result.success,
            message: result.message,
          })
        } catch {
          completed.push({
            id: user.id,
            username: user.username,
            success: false,
            message: t(ERROR_MESSAGES.UNEXPECTED),
          })
        }
      }
      setResults(completed)
      const succeeded = new Set(
        completed
          .filter((result) => result.success)
          .map((result) => String(result.id))
      )
      props.table.setRowSelection((selection) =>
        Object.fromEntries(
          Object.entries(selection).filter(([id]) => !succeeded.has(id))
        )
      )
      triggerRefresh()
    } finally {
      running.current = false
      setIsRunning(false)
    }
  }

  let description = t('Batch user action completed.')
  if (!results) {
    description =
      pending?.action === 'delete'
        ? t(
            'Permanently delete these {{count}} users? This cannot be undone.',
            {
              count: pending.users.length,
            }
          )
        : t('Disable these {{count}} users? You can enable them again later.', {
            count: pending?.users.length ?? 0,
          })
  }

  return (
    <>
      <BulkActionsToolbar
        table={props.table}
        entityName={t('User')}
        placement='inline'
      >
        <Button
          variant='outline'
          size='sm'
          disabled={unavailable || isRunning}
          onClick={() => {
            setResults(null)
            setPending({ action: 'disable', users: selected })
          }}
        >
          <PowerOff />
          {t('Disable')}
        </Button>
        <Button
          variant='destructive'
          size='sm'
          disabled={unavailable || isRunning}
          onClick={() => {
            setResults(null)
            setPending({ action: 'delete', users: selected })
          }}
        >
          <Trash2 />
          {t('Delete')}
        </Button>
      </BulkActionsToolbar>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !running.current) {
            setPending(null)
            setResults(null)
          }
        }}
        title={
          pending?.action === 'delete'
            ? t('Delete selected users')
            : t('Disable selected users')
        }
        desc={description}
        confirmText={pending?.action === 'delete' ? t('Delete') : t('Disable')}
        destructive={pending?.action === 'delete'}
        isLoading={isRunning}
        disabled={results !== null}
        cancelBtnText={results ? t('Close') : t('Cancel')}
        handleConfirm={handleConfirm}
      >
        <ul
          className='max-h-64 space-y-2 overflow-y-auto text-sm'
          aria-live='polite'
        >
          {results
            ? results.map((result) => (
                <li
                  key={result.id}
                  className={
                    result.success ? 'text-success' : 'text-destructive'
                  }
                >
                  {result.username} (#{result.id}):{' '}
                  {result.success
                    ? t('Success')
                    : `${t('Failed')}: ${result.message || t(ERROR_MESSAGES.UNEXPECTED)}`}
                </li>
              ))
            : pending?.users.map((user) => (
                <li key={user.id}>
                  {user.username} (#{user.id})
                </li>
              ))}
        </ul>
      </ConfirmDialog>
    </>
  )
}
