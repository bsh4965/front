import type { Activity, Priority, TaskStatus } from '../../api/types'
import { useActivities } from '../../hooks/queries'
import { Avatar, Spinner } from '../../components/ui'
import { formatDateTime, PRIORITY_LABEL, relativeTime, STATUS_LABEL } from '../../lib/format'

/** 할 일 변경 이력. 서버가 남긴 action과 from/to를 사람이 읽는 문장으로 바꾼다. */
export function ActivityList({
  taskId,
  memberName,
  nodeTitle,
}: {
  taskId: number
  memberName: (userId: number) => string | undefined
  nodeTitle: (nodeId: number) => string | undefined
}) {
  const { data, isPending } = useActivities(taskId)
  if (isPending) return <Spinner />
  const items = data?.content ?? []
  if (items.length === 0) return <p className="text-sm text-muted">아직 이력이 없습니다.</p>

  return (
    <ol className="flex flex-col gap-3">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <Avatar name={a.actor.name} size={26} />
          <div className="min-w-0 flex-1 text-sm">
            <p>
              <span className="font-medium">{a.actor.name}</span>{' '}
              <span className="text-muted">{describe(a, memberName, nodeTitle)}</span>
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

const LEVEL_TO_PRIORITY: Priority[] = ['P0', 'P1', 'P2', 'P3']

function describe(
  a: Activity,
  memberName: (userId: number) => string | undefined,
  nodeTitle: (nodeId: number) => string | undefined,
): string {
  const change = (field: string) => a.changes[field]
  switch (a.action) {
    case 'TASK_CREATED':
      return '할 일을 만들었습니다'
    case 'TASK_DELETED':
      return '할 일을 삭제했습니다'
    case 'TASK_PRIORITY_CHANGED': {
      const c = change('priority')
      const label = (v: unknown) => {
        const p = LEVEL_TO_PRIORITY[Number(v)]
        return p ? `${p} ${PRIORITY_LABEL[p]}` : String(v)
      }
      return `우선순위를 ${label(c?.from)}에서 ${label(c?.to)}(으)로 바꿨습니다`
    }
    case 'TASK_STATUS_CHANGED': {
      const c = change('status')
      return `상태를 ${STATUS_LABEL[c?.from as TaskStatus] ?? c?.from}에서 ${STATUS_LABEL[c?.to as TaskStatus] ?? c?.to}(으)로 바꿨습니다`
    }
    case 'TASK_ASSIGNEE_CHANGED': {
      const c = change('assignee')
      const who = (v: unknown) => (v == null ? '없음' : (memberName(Number(v)) ?? '나간 멤버'))
      return `담당자를 ${who(c?.from)}에서 ${who(c?.to)}(으)로 바꿨습니다`
    }
    case 'TASK_DUE_CHANGED': {
      const c = change('dueAt')
      const when = (v: unknown) => (v == null ? '없음' : formatDateTime(String(v)))
      return `마감을 ${when(c?.from)}에서 ${when(c?.to)}(으)로 바꿨습니다`
    }
    case 'TASK_MOVED': {
      const c = change('node')
      const where = (v: unknown) => nodeTitle(Number(v)) ?? '삭제된 노드'
      return `${where(c?.from)}에서 ${where(c?.to)}(으)로 옮겼습니다`
    }
    default:
      return a.action
  }
}
