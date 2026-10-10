import { useState } from 'react'
import { useNavigate } from 'react-router'
import * as API from '../api/endpoints'
import { PageBody, PageHeader } from '../components/AppShell'
import { ConfirmSheet } from '../components/Sheet'
import { CheckIcon, LogOutIcon } from '../components/icons'
import { Avatar, Button, Chip } from '../components/ui'
import { useToast } from '../components/toast'
import { ROLE_LABEL } from '../lib/format'
import { useSession } from '../state/session'
import { useCurrentTeam } from '../state/team'

export function MePage() {
  const { user } = useSession()
  const { team, teams, setTeamId } = useCurrentTeam()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmAll, setConfirmAll] = useState(false)
  const [pending, setPending] = useState(false)

  const run = async (fn: () => Promise<void>, message: string) => {
    setPending(true)
    try {
      await fn()
      toast(message, 'success')
    } finally {
      setPending(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <PageHeader title="나" />
      <PageBody>
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          {user ? <Avatar name={user.name} size={52} /> : null}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user?.name}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
        </section>

        <h2 className="mt-6 mb-2 px-1 text-[13px] font-semibold text-muted">내 팀</h2>
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {teams.map((t) => (
            <li key={t.teamId} className="border-b border-line last:border-b-0">
              <button onClick={() => setTeamId(t.teamId)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-2">
                <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                <Chip>{ROLE_LABEL[t.role]}</Chip>
                <span className="flex size-6 items-center justify-center text-accent">{t.teamId === team?.teamId ? <CheckIcon size={18} /> : null}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <Button loading={pending} onClick={() => void run(API.logout, '로그아웃했습니다.')}>
            <LogOutIcon size={18} /> 로그아웃
          </Button>
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmAll(true)}>
            모든 기기에서 로그아웃
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          iPhone에서는 Safari 공유 버튼 → “홈 화면에 추가”로 앱처럼 쓸 수 있어요.
          <br />
          홈 화면 앱은 Safari와 로그인이 따로라 처음 한 번 다시 로그인해야 해요.
        </p>
      </PageBody>
      <ConfirmSheet
        open={confirmAll}
        title="모든 기기에서 로그아웃할까요?"
        body="이 기기를 포함해 로그인된 모든 브라우저·앱에서 로그아웃됩니다."
        confirmLabel="모두 로그아웃"
        loading={pending}
        onConfirm={() => void run(API.logoutAll, '모든 기기에서 로그아웃했습니다.')}
        onClose={() => setConfirmAll(false)}
      />
    </>
  )
}
