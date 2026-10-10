import { useEffect, useMemo, useState } from 'react'
import * as API from '../../api/endpoints'
import type { Decision, DecisionStatus } from '../../api/types'
import { Sheet } from '../../components/Sheet'
import { Button, Field, Input, Segmented, Select, Textarea } from '../../components/ui'
import { invalidateDecisionViews, useQueryClient } from '../../hooks/queries'
import { useAction } from '../../hooks/useAction'
import { DECISION_LABEL } from '../../lib/format'
import { flatten, type TreeIndex } from '../../lib/tree'
import { needsRationale, RATIONALE_LABEL, RATIONALE_PLACEHOLDER } from './outcome'

const OUTCOMES: DecisionStatus[] = ['ADOPTED', 'REJECTED', 'DEFERRED', 'PROPOSED']

/**
 * 결정 기록. 무엇을, 한다/안 한다/보류/미정, 왜를 한 번에 남긴다.
 * 미정으로 두면 나중에 상세에서 결과를 기록한다.
 */
export function DecisionRecordSheet({
  open,
  onClose,
  projectId,
  index,
  nodeId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  index: TreeIndex
  nodeId?: number
  onCreated?: (decision: Decision) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="결정 기록">
      {open ? (
        <RecordForm projectId={projectId} index={index} initialNodeId={nodeId} onClose={onClose} onCreated={onCreated} />
      ) : null}
    </Sheet>
  )
}

function RecordForm({
  projectId,
  index,
  initialNodeId,
  onClose,
  onCreated,
}: {
  projectId: number
  index: TreeIndex
  initialNodeId?: number
  onClose: () => void
  onCreated?: (decision: Decision) => void
}) {
  const qc = useQueryClient()
  const nodes = useMemo(() => flatten(index), [index])
  const [nodeId, setNodeId] = useState<number>(initialNodeId ?? index.root?.id ?? 0)
  const [title, setTitle] = useState('')
  const [outcome, setOutcome] = useState<DecisionStatus>('ADOPTED')
  const [rationale, setRationale] = useState('')
  const [context, setContext] = useState('')
  useEffect(() => setNodeId(initialNodeId ?? index.root?.id ?? 0), [initialNodeId, index.root?.id])

  const required = needsRationale(outcome)
  const canSubmit = title.trim().length > 0 && (!required || rationale.trim().length > 0)

  const create = useAction(
    () =>
      API.createDecision(projectId, {
        nodeId,
        title: title.trim(),
        context: context.trim() || null,
        status: outcome === 'PROPOSED' ? null : outcome,
        rationale: rationale.trim() || null,
      }),
    {
      successMessage: '결정을 기록했습니다.',
      onSuccess: (decision) => {
        invalidateDecisionViews(qc, decision.id)
        onClose()
        onCreated?.(decision)
      },
    },
  )

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) create.mutate(undefined)
      }}
    >
      <Field label="어느 기능에">
        <Select value={nodeId} onChange={(e) => setNodeId(Number(e.target.value))}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {'  '.repeat(n.depth)}
              {n.parentId === null ? `${n.title} (프로젝트 전체)` : n.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="무엇을">
        <Input value={title} maxLength={200} required autoFocus placeholder="예: 결제는 외부 PG를 쓴다" onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-muted">결과</span>
        <Segmented
          label="결과"
          value={outcome}
          onChange={setOutcome}
          options={OUTCOMES.map((s) => ({ value: s, label: DECISION_LABEL[s] }))}
        />
      </div>
      {outcome !== 'PROPOSED' ? (
        <Field label={RATIONALE_LABEL[outcome] ?? '이유'}>
          <Textarea
            value={rationale}
            maxLength={10000}
            required={required}
            placeholder={RATIONALE_PLACEHOLDER[outcome]}
            onChange={(e) => setRationale(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label="배경 (선택)" hint={outcome === 'PROPOSED' ? '결과는 나중에 상세에서 기록할 수 있어요.' : undefined}>
        <Textarea
          value={context}
          maxLength={20000}
          className="min-h-20"
          placeholder="어떤 상황에서 나온 고민인가요?"
          onChange={(e) => setContext(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={create.isPending} disabled={!canSubmit}>
          기록
        </Button>
      </div>
    </form>
  )
}
