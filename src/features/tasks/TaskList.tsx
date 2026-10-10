import type { Priority, Task } from '../../api/types'
import { Avatar, Chip } from '../../components/ui'
import { ClockIcon } from '../../components/icons'
import { formatDue, PRIORITIES, PRIORITY_LABEL } from '../../lib/format'

const BAR: Record<Priority, string> = { P0: 'bg-p0', P1: 'bg-p1', P2: 'bg-p2', P3: 'bg-p3' }

/**
 * 우선순위 큐. 서버가 준 순서를 그대로 보여 주고 우선순위별로 묶기만 한다.
 * (우선순위가 정렬의 첫 번째 기준이라 묶어도 순서가 바뀌지 않는다. 화면에서 따로 정렬하지 않는다.)
 */
export function TaskList({
  tasks,
  onOpen,
  showProject = false,
}: {
  tasks: Task[]
  onOpen: (taskId: number) => void
  showProject?: boolean
}) {
  return (
    <div className="flex flex-col gap-5">
      {PRIORITIES.map((p) => {
        const group = tasks.filter((t) => t.priority === p)
        if (group.length === 0) return null
        return (
          <section key={p} aria-label={`${p} ${PRIORITY_LABEL[p]}`}>
            <h2 className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold text-muted">
              <span className={`size-2 rounded-full ${BAR[p]}`} aria-hidden="true" />
              {p} {PRIORITY_LABEL[p]}
              <span className="font-normal">{group.length}</span>
            </h2>
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {group.map((task) => (
                <li key={task.id} className="border-b border-line last:border-b-0">
                  <TaskRow task={task} onOpen={onOpen} showProject={showProject} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function TaskRow({ task, onOpen, showProject }: { task: Task; onOpen: (id: number) => void; showProject: boolean }) {
  const due = task.dueAt ? formatDue(task.dueAt) : null
  return (
    <button
      onClick={() => onOpen(task.id)}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2 active:bg-surface-2"
    >
      <span className={`h-9 w-1 shrink-0 rounded-full ${BAR[task.priority]}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {task.status === 'IN_PROGRESS' ? <Chip tone="accent">진행 중</Chip> : null}
          {due ? (
            <Chip tone={due.tone === 'overdue' ? 'danger' : due.tone === 'today' ? 'warn' : 'neutral'}>
              <ClockIcon size={12} />
              {due.text}
            </Chip>
          ) : null}
          <span className="truncate">
            {showProject ? `${task.projectName} · ` : ''}
            {task.nodeTitle}
          </span>
        </span>
      </span>
      {task.assignee ? <Avatar name={task.assignee.name} /> : null}
    </button>
  )
}
