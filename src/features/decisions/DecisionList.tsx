import { useState } from 'react'
import type { DecisionStatus } from '../../api/types'
import { PlusIcon } from '../../components/icons'
import { Button, Chip, EmptyState, ErrorState, Loading, Select } from '../../components/ui'
import { useDecisions } from '../../hooks/queries'
import { DECISION_LABEL, DECISION_TONE, relativeTime } from '../../lib/format'

const FILTERS: (DecisionStatus | '')[] = ['', 'ADOPTED', 'REJECTED', 'DEFERRED', 'PROPOSED', 'DISCUSSING', 'SUPERSEDED']

/** 프로젝트의 결정 목록. 최근 바뀐 순. 무엇을 하기로/안 하기로 했는지 한눈에 본다. */
export function DecisionList({ projectId, onOpen, onAdd }: { projectId: number; onOpen: (id: number) => void; onAdd: () => void }) {
  const [status, setStatus] = useState<DecisionStatus | ''>('')
  const { data, isPending, error, refetch } = useDecisions(projectId, status || null)

  return (
    <div className="flex flex-col gap-4">
      <Select aria-label="결과로 거르기" value={status} onChange={(e) => setStatus(e.target.value as DecisionStatus | '')}>
        {FILTERS.map((s) => (
          <option key={s} value={s}>
            {s ? DECISION_LABEL[s] : '모든 결정'}
          </option>
        ))}
      </Select>
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState
          title={status ? `“${DECISION_LABEL[status]}”인 결정이 없어요` : '아직 기록한 결정이 없어요'}
          body="하기로 한 것, 안 하기로 한 것과 그 이유를 남겨 두면 나중에 왜 그랬는지 바로 찾을 수 있어요."
          action={
            <Button variant="primary" onClick={onAdd}>
              <PlusIcon size={18} /> 결정 기록
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {data.content.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => onOpen(d.id)}
                  className="flex w-full flex-col gap-1 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-accent/40"
                >
                  <span className="flex items-center gap-2">
                    <Chip tone={DECISION_TONE[d.status]}>{DECISION_LABEL[d.status]}</Chip>
                    <span className="truncate text-xs text-muted">{d.nodeTitle}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">{relativeTime(d.updatedAt)}</span>
                  </span>
                  <span className={`text-[15px] font-medium ${d.status === 'SUPERSEDED' ? 'text-muted line-through' : ''}`}>{d.title}</span>
                  {d.conclusion ? <span className="text-sm text-muted">{d.conclusion}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {data.hasNext ? <p className="text-center text-xs text-muted">최근 {data.content.length}개만 보여요. 결과로 걸러 보세요.</p> : null}
        </>
      )}
    </div>
  )
}
