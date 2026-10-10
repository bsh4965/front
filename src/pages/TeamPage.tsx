import { useState } from 'react'
import * as API from '../api/endpoints'
import type { Invitation, TeamMember, TeamRole } from '../api/types'
import { PageBody, PageHeader } from '../components/AppShell'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { CopyIcon, PencilIcon, PlusIcon } from '../components/icons'
import { Avatar, Button, Chip, ErrorState, Field, IconButton, Input, Loading, Segmented } from '../components/ui'
import { useToast } from '../components/toast'
import { keys, useQueryClient, useTeam } from '../hooks/queries'
import { useAction } from '../hooks/useAction'
import { formatDateTime, ROLE_LABEL } from '../lib/format'
import { useSession } from '../state/session'
import { useCurrentTeam } from '../state/team'

export function TeamPage() {
  const { team, canManage } = useCurrentTeam()
  const { user } = useSession()
  const qc = useQueryClient()
  const { data, isPending, error, refetch } = useTeam(team?.teamId)
  const [renaming, setRenaming] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [target, setTarget] = useState<TeamMember | null>(null)

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.team(team!.teamId) })
    void qc.invalidateQueries({ queryKey: keys.me })
  }

  return (
    <>
      <PageHeader
        title={data?.name ?? team?.name ?? '팀'}
        subtitle={data ? `멤버 ${data.members.length}명 · 내 역할 ${ROLE_LABEL[data.myRole]}` : undefined}
        actions={
          canManage ? (
            <>
              <IconButton label="팀 이름 변경" onClick={() => setRenaming(true)}>
                <PencilIcon size={18} />
              </IconButton>
              <Button variant="primary" size="sm" onClick={() => setInviting(true)}>
                <PlusIcon size={16} /> 초대
              </Button>
            </>
          ) : null
        }
      />
      <PageBody>
        {isPending ? (
          <Loading />
        ) : error || !data ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {data.members.map((m) => {
              const manageable = canManage && m.role !== 'OWNER' && m.userId !== user?.id
              return (
                <li key={m.userId} className="border-b border-line last:border-b-0">
                  <button
                    disabled={!manageable}
                    onClick={() => setTarget(m)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-surface-2"
                  >
                    <Avatar name={m.name} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {m.name}
                        {m.userId === user?.id ? <span className="text-muted"> (나)</span> : null}
                      </span>
                      <span className="block truncate text-[13px] text-muted">{m.email}</span>
                    </span>
                    <Chip tone={m.role === 'MEMBER' ? 'neutral' : 'accent'}>{ROLE_LABEL[m.role]}</Chip>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {!canManage ? <p className="mt-3 text-center text-xs text-muted">초대와 역할 변경은 소유자·관리자만 할 수 있어요.</p> : null}
      </PageBody>

      {team ? (
        <>
          <RenameSheet open={renaming} onClose={() => setRenaming(false)} teamId={team.teamId} name={data?.name ?? team.name} onDone={refresh} />
          <InviteSheet open={inviting} onClose={() => setInviting(false)} teamId={team.teamId} />
          <MemberSheet member={target} teamId={team.teamId} onClose={() => setTarget(null)} onDone={refresh} />
        </>
      ) : null}
    </>
  )
}

function RenameSheet({ open, onClose, teamId, name, onDone }: { open: boolean; onClose: () => void; teamId: number; name: string; onDone: () => void }) {
  const [value, setValue] = useState(name)
  const rename = useAction(() => API.renameTeam(teamId, value.trim()), {
    successMessage: '팀 이름을 바꿨습니다.',
    onSuccess: () => {
      onDone()
      onClose()
    },
  })
  return (
    <Sheet open={open} onClose={onClose} title="팀 이름 변경">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) rename.mutate(undefined)
        }}
      >
        <Field label="팀 이름">
          <Input value={value} maxLength={100} required autoFocus onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" loading={rename.isPending}>
          저장
        </Button>
      </form>
    </Sheet>
  )
}

function InviteSheet({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: number }) {
  const toast = useToast()
  const [role, setRole] = useState<TeamRole>('MEMBER')
  const [email, setEmail] = useState('')
  const [days, setDays] = useState('7')
  const [result, setResult] = useState<Invitation | null>(null)

  const create = useAction(
    () => API.createInvitation(teamId, { role, email: email.trim() || undefined, expiresInDays: Number(days) || undefined }),
    { onSuccess: setResult },
  )

  const close = () => {
    setResult(null)
    setEmail('')
    onClose()
  }

  const link = result ? `${window.location.origin}/register?code=${encodeURIComponent(result.code)}` : ''
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('복사했습니다.', 'success')
    } catch {
      toast('복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.', 'error')
    }
  }

  return (
    <Sheet open={open} onClose={close} title="팀원 초대">
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">이 코드는 지금 한 번만 보여요. 가입할 사람에게 링크나 코드를 전달하세요.</p>
          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="text-xs text-muted">초대 코드</p>
            <p className="mt-1 font-mono text-lg break-all select-all">{result.code}</p>
            <p className="mt-2 text-xs text-muted">
              {ROLE_LABEL[result.role]}로 가입 · {formatDateTime(result.expiresAt)}까지{result.email ? ` · ${result.email} 전용` : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void copy(result.code)}>
              <CopyIcon size={18} /> 코드 복사
            </Button>
            <Button variant="primary" onClick={() => void copy(link)}>
              <CopyIcon size={18} /> 링크 복사
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setResult(null)}>
            다른 초대 만들기
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(undefined)
          }}
        >
          <Field label="역할">
            <Segmented
              label="역할"
              value={role}
              onChange={setRole}
              options={[
                { value: 'MEMBER', label: '멤버' },
                { value: 'ADMIN', label: '관리자' },
              ]}
            />
          </Field>
          <Field label="이메일(선택)" hint="정하면 그 이메일로만 가입할 수 있어요.">
            <Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="유효 기간(일)" hint="1~30일">
            <Input type="number" min={1} max={30} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" loading={create.isPending}>
            초대 코드 만들기
          </Button>
        </form>
      )}
    </Sheet>
  )
}

function MemberSheet({ member, teamId, onClose, onDone }: { member: TeamMember | null; teamId: number; onClose: () => void; onDone: () => void }) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const changeRole = useAction((role: TeamRole) => API.changeMemberRole(teamId, member!.userId, role), {
    successMessage: '역할을 바꿨습니다.',
    onSuccess: () => {
      onDone()
      onClose()
    },
  })
  const remove = useAction(() => API.removeMember(teamId, member!.userId), {
    successMessage: '팀에서 내보냈습니다.',
    onSuccess: () => {
      onDone()
      setConfirmRemove(false)
      onClose()
    },
  })
  return (
    <Sheet open={member !== null} onClose={onClose} title={member?.name ?? '멤버'}>
      {member ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{member.email}</p>
          <Field label="역할">
            <Segmented
              label="역할"
              value={member.role}
              onChange={(r) => r !== member.role && changeRole.mutate(r)}
              options={[
                { value: 'MEMBER', label: '멤버' },
                { value: 'ADMIN', label: '관리자' },
              ]}
            />
          </Field>
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>
            팀에서 내보내기
          </Button>
          <ConfirmSheet
            open={confirmRemove}
            title="팀에서 내보낼까요?"
            body={`${member.name}님은 더는 이 팀을 볼 수 없어요. 만든 할 일과 기록은 남습니다.`}
            confirmLabel="내보내기"
            loading={remove.isPending}
            onConfirm={() => remove.mutate(undefined)}
            onClose={() => setConfirmRemove(false)}
          />
        </div>
      ) : null}
    </Sheet>
  )
}
