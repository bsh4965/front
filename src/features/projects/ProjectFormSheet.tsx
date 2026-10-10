import { useState } from 'react'
import type { ProjectInput } from '../../api/endpoints'
import type { Project } from '../../api/types'
import { Sheet } from '../../components/Sheet'
import { CheckIcon } from '../../components/icons'
import { Button, Field, Input, Textarea } from '../../components/ui'

const COLORS = ['#3B5BDB', '#1C7ED6', '#0CA678', '#37B24D', '#F59F00', '#F76707', '#E03131', '#AE3EC9', '#868E96']

/** 프로젝트 만들기·수정. 수정은 보낸 값으로 전부 바뀐다. */
export function ProjectFormSheet({
  open,
  onClose,
  project,
  onSubmit,
  pending,
}: {
  open: boolean
  onClose: () => void
  project?: Project
  onSubmit: (input: ProjectInput) => void
  pending: boolean
}) {
  return (
    <Sheet open={open} onClose={onClose} title={project ? '프로젝트 수정' : '새 프로젝트'}>
      {open ? <ProjectForm project={project} onSubmit={onSubmit} pending={pending} /> : null}
    </Sheet>
  )
}

function ProjectForm({ project, onSubmit, pending }: { project?: Project; onSubmit: (input: ProjectInput) => void; pending: boolean }) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState<string | null>(project?.color ?? COLORS[0])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSubmit({ name: name.trim(), description: description.trim() || null, color })
      }}
    >
      <Field label="이름" hint="마인드맵 가운데에 보입니다.">
        <Input value={name} maxLength={150} required autoFocus placeholder="예: 결제 개편" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="설명(선택)">
        <Textarea value={description} maxLength={10000} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-muted">색</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`색 ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className="flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-fg"
              style={{ background: c }}
            >
              {color === c ? <CheckIcon size={18} className="text-white" /> : null}
            </button>
          ))}
        </div>
      </fieldset>
      <Button type="submit" variant="primary" loading={pending} disabled={!name.trim()}>
        {project ? '저장' : '만들기'}
      </Button>
    </form>
  )
}
