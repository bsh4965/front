import { useEffect, useMemo, useState } from 'react'
import * as API from '../../api/endpoints'
import type { Task } from '../../api/types'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { MoveIcon, PencilIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { Button, Chip, Field, Input, Loading, Select, Textarea } from '../../components/ui'
import { invalidateProjectViews, keys, useNode, useProjectQueue, useQueryClient } from '../../hooks/queries'
import { useAction } from '../../hooks/useAction'
import { DECISION_LABEL, DECISION_TONE } from '../../lib/format'
import { childrenOf, decisionsOf, flatten, pathTitles, subtreeIds, type TreeIndex } from '../../lib/tree'
import { TaskList } from '../tasks/TaskList'

type Mode = 'view' | 'edit' | 'add' | 'move'

interface NodeSheetActions {
  onOpenTask: (taskId: number, context: Task[]) => void
  onAddTask: (nodeId: number) => void
  onOpenDecision: (decisionId: number) => void
  onAddDecision: (nodeId: number) => void
}

/** 노드(기능) 상세: 이 기능의 결정, 제목·설명 수정, 하위 노드 추가, 옮기기, 삭제, 이 가지의 할 일. */
export function NodeSheet({
  projectId,
  nodeId,
  index,
  onClose,
  onOpenTask,
  onAddTask,
  onOpenDecision,
  onAddDecision,
}: {
  projectId: number
  nodeId: number | null
  index: TreeIndex
  onClose: () => void
} & NodeSheetActions) {
  const node = nodeId !== null ? index.byId.get(nodeId) : undefined
  return (
    <Sheet open={nodeId !== null} onClose={onClose} title={node?.title ?? '노드'}>
      {nodeId !== null && node ? (
        <NodeDetailBody
          key={nodeId}
          projectId={projectId}
          nodeId={nodeId}
          index={index}
          onClose={onClose}
          onOpenTask={onOpenTask}
          onAddTask={onAddTask}
          onOpenDecision={onOpenDecision}
          onAddDecision={onAddDecision}
        />
      ) : null}
    </Sheet>
  )
}

function NodeDetailBody({
  projectId,
  nodeId,
  index,
  onClose,
  onOpenTask,
  onAddTask,
  onOpenDecision,
  onAddDecision,
}: {
  projectId: number
  nodeId: number
  index: TreeIndex
  onClose: () => void
} & NodeSheetActions) {
  const qc = useQueryClient()
  const treeNode = index.byId.get(nodeId)!
  const isRoot = treeNode.parentId === null
  const { data: detail, isPending } = useNode(nodeId)
  const { data: tasks } = useProjectQueue(projectId, nodeId, false)
  const [mode, setMode] = useState<Mode>('view')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const done = () => {
    invalidateProjectViews(qc)
    void qc.invalidateQueries({ queryKey: keys.node(nodeId) })
    setMode('view')
  }

  const remove = useAction(() => API.deleteNode(nodeId, detail!.version), {
    successMessage: '노드를 삭제했습니다.',
    onSuccess: () => {
      invalidateProjectViews(qc)
      setConfirmDelete(false)
      onClose()
    },
  })

  if (isPending || !detail) return <Loading />

  const path = pathTitles(index, nodeId)
  const childCount = childrenOf(index, nodeId).length
  const descendantCount = subtreeIds(index, nodeId).size - 1
  const decisions = decisionsOf(index, nodeId)

  return (
    <div className="flex flex-col gap-5">
      {!isRoot && path.length > 1 ? <p className="-mt-2 text-[13px] text-muted">{path.slice(0, -1).join(' › ')}</p> : null}

      {mode === 'edit' ? (
        <EditNode nodeId={nodeId} title={detail.title} description={detail.description} version={detail.version} isRoot={isRoot} onDone={done} onCancel={() => setMode('view')} />
      ) : mode === 'add' ? (
        <AddChild projectId={projectId} parentId={nodeId} onDone={done} onCancel={() => setMode('view')} />
      ) : mode === 'move' ? (
        <MoveNode nodeId={nodeId} index={index} version={detail.version} onDone={done} onCancel={() => setMode('view')} />
      ) : (
        <>
          {detail.description ? <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{detail.description}</p> : null}
          <section>
            <h4 className="mb-2 text-[13px] font-medium text-muted">이 기능의 결정 {decisions.length || ''}</h4>
            {decisions.length > 0 ? (
              <ul className="mb-2 flex flex-col gap-1.5">
                {decisions.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => onOpenDecision(d.id)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-3 text-left hover:border-accent/40"
                    >
                      <Chip tone={DECISION_TONE[d.status]}>{DECISION_LABEL[d.status]}</Chip>
                      <span className={`min-w-0 flex-1 truncate text-[15px] ${d.status === 'SUPERSEDED' ? 'text-muted line-through' : ''}`}>
                        {d.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 text-sm text-muted">하기로 한 것, 안 하기로 한 것과 그 이유를 남겨 보세요.</p>
            )}
            <Button variant="primary" className="w-full" onClick={() => onAddDecision(nodeId)}>
              <PlusIcon size={18} /> 결정 기록
            </Button>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setMode('add')}>
              <PlusIcon size={18} /> 하위 노드
            </Button>
            <Button onClick={() => onAddTask(nodeId)}>
              <PlusIcon size={18} /> 할 일
            </Button>
            <Button onClick={() => setMode('edit')}>
              <PencilIcon size={18} /> 수정
            </Button>
            {!isRoot ? (
              <Button onClick={() => setMode('move')}>
                <MoveIcon size={18} /> 옮기기
              </Button>
            ) : null}
          </div>
        </>
      )}

      <section>
        <h4 className="mb-2 text-[13px] font-medium text-muted">
          이 가지의 할 일 {tasks?.length ? tasks.length : ''}
          {childCount > 0 ? <span className="font-normal"> · 하위 노드 포함</span> : null}
        </h4>
        {tasks && tasks.length > 0 ? (
          <TaskList tasks={tasks} onOpen={(id) => onOpenTask(id, tasks)} />
        ) : (
          <p className="text-sm text-muted">열린 할 일이 없습니다.</p>
        )}
      </section>

      {!isRoot && mode === 'view' ? (
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <TrashIcon size={18} /> 노드 삭제
        </Button>
      ) : null}
      <ConfirmSheet
        open={confirmDelete}
        title="노드를 삭제할까요?"
        body={
          descendantCount > 0
            ? `“${detail.title}”과 하위 노드 ${descendantCount}개, 거기 달린 할 일·결정이 함께 삭제됩니다.`
            : `“${detail.title}”과 거기 달린 할 일·결정이 함께 삭제됩니다.`
        }
        confirmLabel="삭제"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(undefined)}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function EditNode({
  nodeId,
  title: initialTitle,
  description: initialDescription,
  version,
  isRoot,
  onDone,
  onCancel,
}: {
  nodeId: number
  title: string
  description: string | null
  version: number
  isRoot: boolean
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const save = useAction(() => API.updateNode(nodeId, { title: title.trim(), description: description.trim() || null, version }), {
    onSuccess: onDone,
  })
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim()) save.mutate(undefined)
      }}
    >
      <Field label="제목" hint={isRoot ? '루트 노드의 제목은 프로젝트 이름과 같아요. 바꾸면 둘 다 바뀝니다.' : undefined}>
        <Input value={title} maxLength={150} required autoFocus onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="설명">
        <Textarea value={description} maxLength={10000} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={save.isPending}>
          저장
        </Button>
      </div>
    </form>
  )
}

function AddChild({ projectId, parentId, onDone, onCancel }: { projectId: number; parentId: number; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const create = useAction(() => API.createNode(projectId, { parentId, title: title.trim() }), {
    successMessage: '하위 노드를 추가했습니다.',
    onSuccess: onDone,
  })
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim()) create.mutate(undefined)
      }}
    >
      <Field label="새 하위 노드 제목">
        <Input value={title} maxLength={150} required autoFocus placeholder="예: 인증" onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={create.isPending} disabled={!title.trim()}>
          추가
        </Button>
      </div>
    </form>
  )
}

function MoveNode({
  nodeId,
  index,
  version,
  onDone,
  onCancel,
}: {
  nodeId: number
  index: TreeIndex
  version: number
  onDone: () => void
  onCancel: () => void
}) {
  // 자기 자신과 하위 노드 아래로는 옮길 수 없다
  const candidates = useMemo(() => flatten(index, subtreeIds(index, nodeId)), [index, nodeId])
  const current = index.byId.get(nodeId)!
  const [parentId, setParentId] = useState<number>(current.parentId ?? candidates[0]?.id)
  useEffect(() => setParentId(current.parentId ?? candidates[0]?.id), [current.parentId, candidates])

  const move = useAction(
    () => API.moveNode(nodeId, { newParentId: parentId, sortOrder: childrenOf(index, parentId).filter((c) => c.id !== nodeId).length, version }),
    { successMessage: '노드를 옮겼습니다.', onSuccess: onDone },
  )
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        move.mutate(undefined)
      }}
    >
      <Field label="새 부모 노드" hint="하위 노드도 함께 옮겨지고, 새 부모의 맨 뒤에 붙습니다.">
        <Select value={parentId} onChange={(e) => setParentId(Number(e.target.value))}>
          {candidates.map((n) => (
            <option key={n.id} value={n.id}>
              {'  '.repeat(n.depth)}
              {n.parentId === null ? `${n.title} (맨 위)` : n.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={move.isPending}>
          옮기기
        </Button>
      </div>
    </form>
  )
}
