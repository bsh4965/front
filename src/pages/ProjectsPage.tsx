import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import * as API from '../api/endpoints'
import type { ProjectStatus } from '../api/types'
import { PageBody, PageHeader } from '../components/AppShell'
import { ChevronRightIcon, PlusIcon } from '../components/icons'
import { Button, EmptyState, ErrorState, Loading, Segmented } from '../components/ui'
import { ProjectFormSheet } from '../features/projects/ProjectFormSheet'
import { invalidateProjectViews, useProjects, useQueryClient } from '../hooks/queries'
import { useAction } from '../hooks/useAction'
import { relativeTime } from '../lib/format'
import { useCurrentTeam } from '../state/team'

export function ProjectsPage() {
  const { team } = useCurrentTeam()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE')
  const { data: page, isPending, error, refetch } = useProjects(team?.teamId, status)
  const projects = page?.content
  const [creating, setCreating] = useState(false)

  const create = useAction((input: API.ProjectInput) => API.createProject(team!.teamId, input), {
    successMessage: '프로젝트를 만들었습니다.',
    onSuccess: (project) => {
      invalidateProjectViews(qc)
      setCreating(false)
      navigate(`/projects/${project.id}`)
    },
  })

  return (
    <>
      <PageHeader
        title="프로젝트"
        subtitle={team?.name}
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <PlusIcon size={16} /> 새 프로젝트
          </Button>
        }
      />
      <PageBody>
        <div className="mb-4">
          <Segmented
            label="상태"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ACTIVE', label: '진행 중' },
              { value: 'ARCHIVED', label: '보관됨' },
            ]}
          />
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !projects || projects.length === 0 ? (
          status === 'ACTIVE' ? (
            <EmptyState
              title="아직 프로젝트가 없어요"
              body="프로젝트를 만들면 이름을 중심으로 가지를 뻗어 할 일과 결정을 정리할 수 있어요."
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  <PlusIcon size={18} /> 첫 프로젝트 만들기
                </Button>
              }
            />
          ) : (
            <EmptyState title="보관된 프로젝트가 없어요" />
          )
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/40"
                >
                  <span className="size-10 shrink-0 rounded-xl" style={{ background: p.color ?? 'var(--c-surface-2)' }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{p.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {p.description || `${relativeTime(p.updatedAt)} 수정`}
                    </span>
                  </span>
                  <ChevronRightIcon size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
      <ProjectFormSheet open={creating} onClose={() => setCreating(false)} onSubmit={(input) => create.mutate(input)} pending={create.isPending} />
    </>
  )
}
