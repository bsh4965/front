import { useEffect, useMemo, useState } from 'react'
import * as API from '../../api/endpoints'
import type { Priority, Task, TaskStatus } from '../../api/types'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, PencilIcon, TrashIcon } from '../../components/icons'
import { Button, Field, IconButton, Input, Loading, PriorityBadge, Segmented, Select, Textarea } from '../../components/ui'
import { invalidateTaskViews, keys, useQueryClient, useTask, useTeam, useTree } from '../../hooks/queries'
import { useAction } from '../../hooks/useAction'
import { formatDateTime, fromLocalInput, PRIORITIES, PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES, toLocalInput } from '../../lib/format'
import { flatten, indexTree } from '../../lib/tree'
import { useCurrentTeam } from '../../state/team'
import { ActivityList } from './ActivityList'

/**
 * 할 일 상세. 우선순위·상태·담당자·마감·노드를 바꾸고 이력을 본다.
 * context는 지금 보고 있는 큐 목록이다. 같은 프로젝트·우선순위 이웃으로 위로/아래로 재정렬할 때 쓴다.
 */
export function TaskSheet({ taskId, onClose, context }: { taskId: number | null; onClose: () => void; context?: Task[] }) {
  return (
    <Sheet open={taskId !== null} onClose={onClose} title="할 일">
      {taskId !== null ? <TaskDetail taskId={taskId} onClose={onClose} context={context} /> : null}
    </Sheet>
  )
}

function TaskDetail({ taskId, onClose, context }: { taskId: number; onClose: () => void; context?: Task[] }) {
  const qc = useQueryClient()
  const { team } = useCurrentTeam()
  const { data: task, isPending, error } = useTask(taskId)
  const { data: teamData } = useTeam(team?.teamId)
  const { data: tree } = useTree(task?.projectId)
  const index = useMemo(() => (tree ? indexTree(tree.nodes) : null), [tree])

  const [editing, setEditing] = useState(false)
  const [pendingPriority, setPendingPriority] = useState<Priority | null>(null)
  const [reason, setReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const applied = (result: Task) => {
    qc.setQueryData(keys.task(result.id), result)
    invalidateTaskViews(qc, result.id)
  }

  const priority = useAction((p: Priority) => API.changePriority(taskId, { priority: p, reason: reason || undefined, version: task!.version }), {
    onSuccess: (r) => {
      applied(r)
      setPendingPriority(null)
      setReason('')
    },
  })
  const status = useAction((s: TaskStatus) => API.changeStatus(taskId, { status: s, version: task!.version }), { onSuccess: applied })
  const assignee = useAction((id: number | null) => API.changeAssignee(taskId, { assigneeId: id, version: task!.version }), { onSuccess: applied })
  const due = useAction((iso: string | null) => API.changeDue(taskId, { dueAt: iso, version: task!.version }), { onSuccess: applied })
  const move = useAction((nodeId: number) => API.moveTask(taskId, { nodeId, version: task!.version }), { onSuccess: applied })
  const reorder = useAction(
    (n: { previousTaskId: number | null; nextTaskId: number | null }) => API.reorderTask(taskId, { ...n, version: task!.version }),
    { onSuccess: applied },
  )
  const remove = useAction(() => API.deleteTask(taskId, task!.version), {
    successMessage: '할 일을 삭제했습니다.',
    onSuccess: () => {
      invalidateTaskViews(qc)
      setConfirmDelete(false)
      onClose()
    },
  })

  if (isPending) return <Loading />
  if (error || !task) return <p className="py-8 text-center text-sm text-danger">{error?.message ?? '할 일을 찾을 수 없습니다.'}</p>

  // 순서를 바꿀 수 있는 이웃: 지금 보이는 목록에서 같은 프로젝트·우선순위·마감인 할 일.
  // 큐는 마감이 수동 순서보다 먼저라서, 마감이 다르면 순서값을 바꿔도 화면 순서가 바뀌지 않는다.
  const group = (context ?? []).filter(
    (t) => t.projectId === task.projectId && t.priority === task.priority && t.dueAt === task.dueAt,
  )
  const at = group.findIndex((t) => t.id === task.id)
  const canUp = at > 0
  const canDown = at >= 0 && at < group.length - 1

  const members = teamData?.members ?? []
  const nodeOptions = index ? flatten(index) : []

  return (
    <div className="flex flex-col gap-6">
      {editing ? (
        <EditForm task={task} onDone={() => setEditing(false)} onSaved={applied} />
      ) : (
        <div>
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-xl leading-snug font-semibold break-words">{task.title}</h3>
            <IconButton label="제목·설명 수정" onClick={() => setEditing(true)} className="-mt-1.5 -mr-2">
              <PencilIcon size={18} />
            </IconButton>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {task.projectName} · {task.nodeTitle}
          </p>
          {task.description ? <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{task.description}</p> : null}
        </div>
      )}

      <Field label="우선순위">
        <Segmented
          label="우선순위"
          value={pendingPriority ?? task.priority}
          onChange={(p) => setPendingPriority(p === task.priority ? null : p)}
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        />
      </Field>
      {pendingPriority ? (
        <div className="-mt-3 flex flex-col gap-2 rounded-2xl bg-surface-2 p-3">
          <p className="text-sm">
            <PriorityBadge priority={task.priority} /> → <PriorityBadge priority={pendingPriority} /> 새 그룹의 맨 뒤로 갑니다.
          </p>
          <Input placeholder="바꾸는 이유(선택, 이력에 남아요)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => setPendingPriority(null)}>
              취소
            </Button>
            <Button size="sm" variant="primary" className="flex-1" loading={priority.isPending} onClick={() => priority.mutate(pendingPriority)}>
              {PRIORITY_LABEL[pendingPriority]}(으)로 변경
            </Button>
          </div>
        </div>
      ) : null}

      <Field label="상태">
        <Segmented
          label="상태"
          value={task.status}
          onChange={(s) => status.mutate(s)}
          options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
        />
      </Field>
      {task.completedAt ? <p className="-mt-4 text-xs text-muted">{formatDateTime(task.completedAt)} 완료</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="담당자">
          <Select
            value={task.assignee?.id ?? ''}
            disabled={assignee.isPending}
            onChange={(e) => assignee.mutate(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">담당자 없음</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <DueField value={task.dueAt} pending={due.isPending} onChange={(iso) => due.mutate(iso)} />
      </div>

      <Field label="노드">
        <Select value={task.nodeId} disabled={move.isPending || !index} onChange={(e) => move.mutate(Number(e.target.value))}>
          {nodeOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {'  '.repeat(n.depth)}
              {n.parentId === null ? `${n.title} (맨 위)` : n.title}
            </option>
          ))}
        </Select>
      </Field>

      {group.length > 1 ? (
        <Field label="순서" hint="같은 프로젝트·우선순위이고 마감이 같은(또는 둘 다 없는) 할 일끼리 순서를 바꿉니다.">
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!canUp}
              loading={reorder.isPending}
              onClick={() => reorder.mutate({ previousTaskId: group[at - 2]?.id ?? null, nextTaskId: group[at - 1].id })}
            >
              <ArrowUpIcon size={18} /> 위로
            </Button>
            <Button
              className="flex-1"
              disabled={!canDown}
              loading={reorder.isPending}
              onClick={() => reorder.mutate({ previousTaskId: group[at + 1].id, nextTaskId: group[at + 2]?.id ?? null })}
            >
              <ArrowDownIcon size={18} /> 아래로
            </Button>
          </div>
        </Field>
      ) : null}

      <section>
        <h4 className="mb-3 flex items-center gap-2 text-[13px] font-medium text-muted">
          <HistoryIcon size={16} /> 변경 이력
        </h4>
        <ActivityList
          taskId={task.id}
          memberName={(id) => members.find((m) => m.userId === id)?.name}
          nodeTitle={(id) => index?.byId.get(id)?.title}
        />
      </section>

      <Button variant="danger" onClick={() => setConfirmDelete(true)}>
        <TrashIcon size={18} /> 할 일 삭제
      </Button>
      <ConfirmSheet
        open={confirmDelete}
        title="할 일을 삭제할까요?"
        body={`“${task.title}”을(를) 삭제합니다. 큐와 트리에서 사라집니다.`}
        confirmLabel="삭제"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(undefined)}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function DueField({ value, pending, onChange }: { value: string | null; pending: boolean; onChange: (iso: string | null) => void }) {
  const [draft, setDraft] = useState(toLocalInput(value))
  useEffect(() => setDraft(toLocalInput(value)), [value])
  const changed = draft !== toLocalInput(value)
  return (
    <Field label="마감">
      <div className="flex gap-2">
        <Input type="datetime-local" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1" />
        {changed ? (
          <Button variant="primary" loading={pending} onClick={() => onChange(fromLocalInput(draft))}>
            저장
          </Button>
        ) : value ? (
          <Button loading={pending} onClick={() => onChange(null)}>
            지우기
          </Button>
        ) : null}
      </div>
    </Field>
  )
}

function EditForm({ task, onDone, onSaved }: { task: Task; onDone: () => void; onSaved: (t: Task) => void }) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const save = useAction(
    () => API.updateTask(task.id, { title: title.trim(), description: description.trim() || null, version: task.version }),
    {
      onSuccess: (r) => {
        onSaved(r)
        onDone()
      },
    },
  )
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim()) save.mutate(undefined)
      }}
    >
      <Field label="제목">
        <Input value={title} maxLength={200} required autoFocus onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="설명">
        <Textarea value={description} maxLength={10000} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onDone}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={save.isPending}>
          저장
        </Button>
      </div>
    </form>
  )
}
