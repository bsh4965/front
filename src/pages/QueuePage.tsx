import { useState } from 'react'
import { PageBody, PageHeader } from '../components/AppShell'
import { PlusIcon } from '../components/icons'
import { Button, EmptyState, ErrorState, Loading, Segmented } from '../components/ui'
import { CreateTaskSheet } from '../features/tasks/CreateTaskSheet'
import { TaskList } from '../features/tasks/TaskList'
import { TaskSheet } from '../features/tasks/TaskSheet'
import { useTeamQueue } from '../hooks/queries'
import { useCurrentTeam } from '../state/team'

/** 첫 화면. 팀의 진행 중 프로젝트 전체에서 열린 할 일을 우선순위 큐 순서로 보여 준다. */
export function QueuePage() {
  const { team } = useCurrentTeam()
  const [mine, setMine] = useState(true)
  const { data: tasks, isPending, error, refetch } = useTeamQueue(team?.teamId, mine)
  const [openTask, setOpenTask] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="우선순위 큐"
        subtitle={team?.name}
        actions={
          <div className="hidden md:block">
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <PlusIcon size={16} /> 할 일
            </Button>
          </div>
        }
      />
      <PageBody>
        <div className="mb-4">
          <Segmented
            label="범위"
            value={mine ? 'mine' : 'team'}
            onChange={(v) => setMine(v === 'mine')}
            options={[
              { value: 'mine', label: '내 할 일' },
              { value: 'team', label: '팀 전체' },
            ]}
          />
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : tasks.length === 0 ? (
          <EmptyState
            title={mine ? '나에게 맡겨진 할 일이 없어요' : '열린 할 일이 없어요'}
            body={mine ? '팀 전체 큐에서 할 일을 맡거나 새로 추가해 보세요.' : '프로젝트에서 할 일을 추가하면 여기에 우선순위 순으로 쌓입니다.'}
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <PlusIcon size={18} /> 할 일 추가
              </Button>
            }
          />
        ) : (
          <TaskList tasks={tasks} onOpen={setOpenTask} showProject />
        )}
      </PageBody>

      <button
        onClick={() => setCreating(true)}
        aria-label="할 일 추가"
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 flex size-14 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-lg md:hidden"
      >
        <PlusIcon size={26} />
      </button>

      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} context={tasks} />
      <CreateTaskSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
