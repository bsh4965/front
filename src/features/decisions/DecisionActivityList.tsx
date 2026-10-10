import type { Activity, DecisionStatus } from '../../api/types'
import { Avatar } from '../../components/ui'
import { DECISION_LABEL, formatDateTime, relativeTime } from '../../lib/format'

/** 결정 변경 이력. 서버의 action과 from/to를 문장으로 바꾼다. */
export function DecisionActivityList({ items }: { items: Activity[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">아직 이력이 없습니다.</p>
  return (
    <ol className="flex flex-col gap-3">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <Avatar name={a.actor.name} size={26} />
          <div className="min-w-0 flex-1 text-sm">
            <p>
              <span className="font-medium">{a.actor.name}</span> <span className="text-muted">{describe(a)}</span>
            </p>
            {a.reason ? <p className="mt-0.5 text-muted">“{a.reason}”</p> : null}
            <time className="text-xs text-muted" dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
              {relativeTime(a.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}

function label(value: unknown): string {
  return DECISION_LABEL[value as DecisionStatus] ?? String(value)
}

function describe(a: Activity): string {
  const c = (field: string) => a.changes[field]
  switch (a.action) {
    case 'DECISION_CREATED':
      return c('supersedes') ? '이전 결정을 다시 정하려고 새 결정을 만들었습니다' : '결정을 만들었습니다'
    case 'DECISION_EDITED':
      return '제목·배경을 고쳤습니다'
    case 'DECISION_OPTION_ADDED':
      return `안 “${String(c('option.title')?.to ?? '')}”을(를) 올렸습니다`
    case 'DECISION_OPTION_EDITED':
      return '안을 고쳤습니다'
    case 'DECISION_OPTION_REMOVED':
      return `안 “${String(c('option.title')?.from ?? '')}”을(를) 지웠습니다`
    case 'DECISION_DISCUSSION_STARTED':
      return `${label(c('status')?.from)}에서 논의를 시작했습니다`
    case 'DECISION_ADOPTED':
      return '하기로 했습니다'
    case 'DECISION_REJECTED':
      return '안 하기로 했습니다'
    case 'DECISION_DEFERRED':
      return '보류했습니다'
    case 'DECISION_SUPERSEDED':
      return '새 결정으로 바꿨습니다'
    default:
      return a.action
  }
}
