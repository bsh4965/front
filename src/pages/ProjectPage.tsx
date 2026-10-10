import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import * as API from '../api/endpoints'
import type { Task } from '../api/types'
import { PageBody, PageHeader } from '../components/AppShell'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { ArchiveIcon, ChevronLeftIcon, ListTreeIcon, MindMapIcon, MoreIcon, PencilIcon, PlusIcon, QueueIcon, TrashIcon } from '../components/icons'
import { Button, Chip, EmptyState, ErrorState, IconButton, Loading, Segmented, Select } from '../components/ui'
import { ProjectFormSheet } from '../features/projects/ProjectFormSheet'
import { CreateTaskSheet } from '../features/tasks/CreateTaskSheet'
import { TaskList } from '../features/tasks/TaskList'
import { TaskSheet } from '../features/tasks/TaskSheet'
import { MindMap } from '../features/tree/MindMap'
import { NodeSheet } from '../features/tree/NodeSheet'
import { TreeView } from '../features/tree/TreeView'
import { invalidateProjectViews, useProjectQueue, useQueryClient, useTree } from '../hooks/queries'
import { useAction } from '../hooks/useAction'
import { flatten, indexTree, type TreeIndex } from '../lib/tree'
import { useCurrentTeam } from '../state/team'

type View = 'tree' | 'map' | 'tasks'

export function ProjectPage() {
  const projectId = Number(useParams().projectId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canManage } = useCurrentTeam()
  const { data: tree, isPending, error, refetch } = useTree(projectId)
  const index = useMemo(() => (tree ? indexTree(tree.nodes) : null), [tree])

  const [view, setView] = useState<View>(() => (window.matchMedia('(min-width: 768px)').matches ? 'map' : 'tree'))
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [openTask, setOpenTask] = useState<{ id: number; context: Task[] } | null>(null)
  const [addTaskNode, setAddTaskNode] = useState<number | undefined>(undefined)
  const [creatingTask, setCreatingTask] = useState(false)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const update = useAction((input: API.ProjectInput) => API.updateProject(projectId, input), {
    successMessage: '프로젝트를 수정했습니다.',
    onSuccess: () => {
      invalidateProjectViews(qc)
      setEditing(false)
    },
  })
  const archive = useAction((archived: boolean) => (archived ? API.unarchiveProject(projectId) : API.archiveProject(projectId)), {
    onSuccess: () => {
      invalidateProjectViews(qc)
      setMenu(false)
    },
  })
  const remove = useAction(() => API.deleteProject(projectId), {
    successMessage: '프로젝트를 삭제했습니다.',
    onSuccess: () => {
      invalidateProjectViews(qc)
      navigate('/projects', { replace: true })
    },
  })

  const back = (
    <Link to="/projects" aria-label="프로젝트 목록" className="-ml-2 flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
      <ChevronLeftIcon />
    </Link>
  )

  if (isPending) {
    return (
      <>
        <PageHeader title="프로젝트" leading={back} />
        <Loading />
      </>
    )
  }
  if (error || !tree || !index) {
    return (
      <>
        <PageHeader title="프로젝트" leading={back} />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </>
    )
  }

  const project = tree.project
  const archived = project.status === 'ARCHIVED'
  const openTaskTotal = tree.nodes.reduce((sum, n) => sum + n.openTaskCount, 0)

  const startAddTask = (nodeId?: number) => {
    setAddTaskNode(nodeId)
    setCreatingTask(true)
  }

  return (
    <>
      <PageHeader
        leading={back}
        title={
          <span className="flex items-center gap-2">
            {project.color ? <span className="size-3 shrink-0 rounded-full" style={{ background: project.color }} aria-hidden="true" /> : null}
            <span className="truncate">{project.name}</span>
            {archived ? <Chip>보관됨</Chip> : null}
          </span>
        }
        subtitle={`노드 ${tree.nodes.length}개 · 열린 할 일 ${openTaskTotal}개`}
        actions={
          <IconButton label="프로젝트 메뉴" onClick={() => setMenu(true)}>
            <MoreIcon />
          </IconButton>
        }
      />
      <PageBody wide>
        <div className="mb-4 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Segmented
              label="보기"
              value={view}
              onChange={setView}
              options={[
                { value: 'tree', label: <span className="inline-flex items-center gap-1.5"><ListTreeIcon size={16} />트리</span> },
                { value: 'map', label: <span className="inline-flex items-center gap-1.5"><MindMapIcon size={16} />마인드맵</span> },
                { value: 'tasks', label: <span className="inline-flex items-center gap-1.5"><QueueIcon size={16} />할 일</span> },
              ]}
            />
          </div>
          <Button variant="primary" onClick={() => startAddTask()} aria-label="할 일 추가">
            <PlusIcon size={18} />
            <span className="hidden sm:inline">할 일</span>
          </Button>
        </div>

        {view === 'tree' ? (
          <>
            <TreeView index={index} onSelect={setSelectedNode} />
            <p className="mt-3 text-center text-xs text-muted">노드를 누르면 하위 노드·할 일을 추가하거나 옮길 수 있어요.</p>
          </>
        ) : view === 'map' ? (
          <MindMap index={index} onSelect={setSelectedNode} />
        ) : (
          <ProjectTasks projectId={projectId} index={index} onOpen={(id, context) => setOpenTask({ id, context })} onAdd={() => startAddTask()} />
        )}
      </PageBody>

      <NodeSheet
        projectId={projectId}
        nodeId={selectedNode}
        index={index}
        onClose={() => setSelectedNode(null)}
        onOpenTask={(id, context) => setOpenTask({ id, context })}
        onAddTask={(nodeId) => startAddTask(nodeId)}
      />
      <TaskSheet taskId={openTask?.id ?? null} context={openTask?.context} onClose={() => setOpenTask(null)} />
      <CreateTaskSheet open={creatingTask} onClose={() => setCreatingTask(false)} projectId={projectId} nodeId={addTaskNode} />

      <Sheet open={menu} onClose={() => setMenu(false)} title={project.name}>
        <div className="flex flex-col gap-2">
          <Button
            className="justify-start"
            onClick={() => {
              setMenu(false)
              setEditing(true)
            }}
          >
            <PencilIcon size={18} /> 이름·설명·색 수정
          </Button>
          {canManage ? (
            <>
              <Button className="justify-start" loading={archive.isPending} onClick={() => archive.mutate(archived)}>
                <ArchiveIcon size={18} /> {archived ? '보관 해제' : '보관하기'}
              </Button>
              <Button
                variant="danger"
                className="justify-start"
                onClick={() => {
                  setMenu(false)
                  setConfirmDelete(true)
                }}
              >
                <TrashIcon size={18} /> 프로젝트 삭제
              </Button>
            </>
          ) : (
            <p className="px-1 pt-2 text-xs text-muted">보관·삭제는 팀 소유자·관리자만 할 수 있어요.</p>
          )}
        </div>
      </Sheet>
      <ProjectFormSheet open={editing} onClose={() => setEditing(false)} project={project} onSubmit={(input) => update.mutate(input)} pending={update.isPending} />
      <ConfirmSheet
        open={confirmDelete}
        title="프로젝트를 삭제할까요?"
        body={`“${project.name}”의 모든 노드·할 일·결정이 함께 삭제됩니다.`}
        confirmLabel="삭제"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(undefined)}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}

function ProjectTasks({
  projectId,
  index,
  onOpen,
  onAdd,
}: {
  projectId: number
  index: TreeIndex
  onOpen: (id: number, context: Task[]) => void
  onAdd: () => void
}) {
  const [nodeId, setNodeId] = useState<number | null>(null)
  const [mine, setMine] = useState(false)
  const { data: tasks, isPending, error, refetch } = useProjectQueue(projectId, nodeId, mine)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Select aria-label="가지로 좁히기" value={nodeId ?? ''} onChange={(e) => setNodeId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">전체 가지</option>
          {flatten(index)
            .filter((n) => n.parentId !== null)
            .map((n) => (
              <option key={n.id} value={n.id}>
                {'  '.repeat(n.depth - 1)}
                {n.title}
              </option>
            ))}
        </Select>
        <Segmented
          label="담당"
          value={mine ? 'mine' : 'all'}
          onChange={(v) => setMine(v === 'mine')}
          options={[
            { value: 'all', label: '모두' },
            { value: 'mine', label: '내 것' },
          ]}
        />
      </div>
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="열린 할 일이 없어요"
          action={
            <Button variant="primary" onClick={onAdd}>
              <PlusIcon size={18} /> 할 일 추가
            </Button>
          }
        />
      ) : (
        <TaskList tasks={tasks} onOpen={(id) => onOpen(id, tasks)} />
      )}
    </div>
  )
}
