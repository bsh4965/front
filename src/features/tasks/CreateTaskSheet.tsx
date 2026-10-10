import { useEffect, useMemo, useState } from 'react'
import * as API from '../../api/endpoints'
import type { Priority } from '../../api/types'
import { Sheet } from '../../components/Sheet'
import { Button, Field, Input, Segmented, Select, Textarea } from '../../components/ui'
import { invalidateTaskViews, useProjects, useQueryClient, useTeam, useTree } from '../../hooks/queries'
import { useAction } from '../../hooks/useAction'
import { fromLocalInput, PRIORITIES, PRIORITY_LABEL } from '../../lib/format'
import { flatten, indexTree } from '../../lib/tree'
import { useCurrentTeam } from '../../state/team'

/**
 * 할 일 만들기. projectId를 주면 그 프로젝트로 고정한다(프로젝트 화면).
 * 큐 화면에서는 프로젝트부터 고른다.
 */
export function CreateTaskSheet({
  open,
  onClose,
  projectId: fixedProjectId,
  nodeId: defaultNodeId,
}: {
  open: boolean
  onClose: () => void
  projectId?: number
  nodeId?: number
}) {
  return (
    <Sheet open={open} onClose={onClose} title="할 일 추가">
      {open ? <CreateTaskForm onClose={onClose} fixedProjectId={fixedProjectId} defaultNodeId={defaultNodeId} /> : null}
    </Sheet>
  )
}

function CreateTaskForm({
  onClose,
  fixedProjectId,
  defaultNodeId,
}: {
  onClose: () => void
  fixedProjectId?: number
  defaultNodeId?: number
}) {
  const qc = useQueryClient()
  const { team } = useCurrentTeam()
  const { data: projects } = useProjects(fixedProjectId ? undefined : team?.teamId, 'ACTIVE')
  const { data: teamData } = useTeam(team?.teamId)

  const [projectId, setProjectId] = useState<number | undefined>(fixedProjectId)
  const { data: tree } = useTree(projectId)
  const index = useMemo(() => (tree ? indexTree(tree.nodes) : null), [tree])

  const [nodeId, setNodeId] = useState<number | undefined>(defaultNodeId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('P2')
  const [due, setDue] = useState('')
  const [assigneeId, setAssigneeId] = useState<number | null>(null)

  // 프로젝트를 고르면 첫 프로젝트·루트 노드를 기본값으로
  useEffect(() => {
    if (!projectId && projects?.length) setProjectId(projects[0].id)
  }, [projects, projectId])
  useEffect(() => {
    if (index?.root && (nodeId === undefined || !index.byId.has(nodeId))) setNodeId(index.root.id)
  }, [index, nodeId])

  const create = useAction(
    () =>
      API.createTask(projectId!, {
        nodeId: nodeId!,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueAt: fromLocalInput(due),
        assigneeId,
      }),
    {
      successMessage: '할 일을 추가했습니다.',
      onSuccess: () => {
        invalidateTaskViews(qc)
        onClose()
      },
    },
  )

  const noProject = !fixedProjectId && projects && projects.length === 0

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim() && projectId && nodeId) create.mutate(undefined)
      }}
    >
      {noProject ? <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">먼저 프로젝트를 만들어 주세요.</p> : null}
      <Field label="제목">
        <Input value={title} maxLength={200} required autoFocus placeholder="무엇을 해야 하나요?" onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="우선순위">
        <Segmented
          label="우선순위"
          value={priority}
          onChange={setPriority}
          options={PRIORITIES.map((p) => ({ value: p, label: `${p} ${PRIORITY_LABEL[p]}` }))}
        />
      </Field>
      {!fixedProjectId ? (
        <Field label="프로젝트">
          <Select value={projectId ?? ''} onChange={(e) => { setProjectId(Number(e.target.value)); setNodeId(undefined) }}>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="노드">
        <Select value={nodeId ?? ''} disabled={!index} onChange={(e) => setNodeId(Number(e.target.value))}>
          {(index ? flatten(index) : []).map((n) => (
            <option key={n.id} value={n.id}>
              {'  '.repeat(n.depth)}
              {n.parentId === null ? `${n.title} (맨 위)` : n.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="마감(선택)">
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="담당자(선택)">
          <Select value={assigneeId ?? ''} onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">담당자 없음</option>
            {(teamData?.members ?? []).map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="설명(선택)">
        <Textarea value={description} maxLength={10000} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" loading={create.isPending} disabled={!title.trim() || !projectId || !nodeId}>
        추가
      </Button>
    </form>
  )
}
