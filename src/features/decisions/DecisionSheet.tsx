import { useState, type ReactNode } from 'react'
import * as API from '../../api/endpoints'
import type { Decision, DecisionStatus, Stance } from '../../api/types'
import { Sheet } from '../../components/Sheet'
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { Avatar, Button, Chip, Field, IconButton, Input, Loading, Segmented, Select, Spinner, Textarea } from '../../components/ui'
import {
  invalidateDecisionViews,
  keys,
  useDecision,
  useDecisionActivities,
  useDecisionComments,
  useDecisionTasks,
  useQueryClient,
} from '../../hooks/queries'
import { useAction } from '../../hooks/useAction'
import { DECISION_LABEL, DECISION_TONE, formatDateTime, relativeTime, STATUS_LABEL } from '../../lib/format'
import { pathTitles, type TreeIndex } from '../../lib/tree'
import { DecisionActivityList } from './DecisionActivityList'
import { needsRationale, NEXT_STATUSES, RATIONALE_LABEL, RATIONALE_PLACEHOLDER } from './outcome'

/**
 * 결정 상세. 맨 위에 "한다/안 한다와 그 이유"를 보여 주고, 결과 기록·다시 결정하기를 한다.
 * 안·투표, 의견, 연결된 할 일, 변경 이력은 접어 둔다.
 */
export function DecisionSheet({
  decisionId,
  index,
  onClose,
  onOpenDecision,
}: {
  decisionId: number | null
  index?: TreeIndex
  onClose: () => void
  onOpenDecision: (decisionId: number) => void
}) {
  return (
    <Sheet open={decisionId !== null} onClose={onClose} title="결정">
      {decisionId !== null ? <DecisionBody key={decisionId} decisionId={decisionId} index={index} onOpenDecision={onOpenDecision} /> : null}
    </Sheet>
  )
}

type Mode = 'view' | 'record' | 'edit' | 'redo'

function DecisionBody({
  decisionId,
  index,
  onOpenDecision,
}: {
  decisionId: number
  index?: TreeIndex
  onOpenDecision: (decisionId: number) => void
}) {
  const qc = useQueryClient()
  const { data: d, isPending, error } = useDecision(decisionId)
  const [mode, setMode] = useState<Mode>('view')

  const applied = (result: Decision) => {
    qc.setQueryData(keys.decision(result.id), result)
    invalidateDecisionViews(qc, result.id)
    setMode('view')
  }

  if (isPending) return <Loading />
  if (error || !d) return <p className="py-8 text-center text-sm text-danger">{error instanceof Error ? error.message : '불러오지 못했습니다.'}</p>

  const path = index ? pathTitles(index, d.nodeId) : [d.nodeTitle]
  const next = NEXT_STATUSES[d.status]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Chip tone={DECISION_TONE[d.status]}>{DECISION_LABEL[d.status]}</Chip>
          <span className="truncate text-[13px] text-muted">{path.length ? path.join(' › ') : '프로젝트 전체'}</span>
        </div>
        <h3 className={`text-xl leading-snug font-semibold ${d.status === 'SUPERSEDED' ? 'text-muted line-through' : ''}`}>{d.title}</h3>
      </div>

      {d.supersededById ? (
        <Notice>
          이 결정은 나중에 바뀌었어요.{' '}
          <button className="font-medium text-accent underline-offset-2 hover:underline" onClick={() => onOpenDecision(d.supersededById!)}>
            새 결정 보기
          </button>
        </Notice>
      ) : null}
      {d.supersedesId ? (
        <Notice>
          이전 결정을 다시 정한 거예요.{' '}
          <button className="font-medium text-accent underline-offset-2 hover:underline" onClick={() => onOpenDecision(d.supersedesId!)}>
            이전 결정 보기
          </button>
        </Notice>
      ) : null}

      {d.rationale ? (
        <section className={`rounded-2xl p-4 ${d.status === 'REJECTED' ? 'bg-danger-soft' : 'bg-success/10'}`}>
          <h4 className="mb-1 text-[13px] font-medium text-muted">{d.status === 'REJECTED' ? '왜 안 하기로 했나' : '왜 하기로 했나'}</h4>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{d.rationale}</p>
          {d.conclusion ? <p className="mt-2 text-sm font-medium">결론: {d.conclusion}</p> : null}
          {d.decidedBy && d.decidedAt ? (
            <p className="mt-2 text-xs text-muted">
              {d.decidedBy.name} · {formatDateTime(d.decidedAt)}
            </p>
          ) : null}
        </section>
      ) : null}

      {mode === 'record' ? (
        <RecordOutcome decision={d} statuses={next} onDone={applied} onCancel={() => setMode('view')} />
      ) : mode === 'edit' ? (
        <EditDecision decision={d} onDone={applied} onCancel={() => setMode('view')} />
      ) : mode === 'redo' ? (
        <Redecide
          decision={d}
          onDone={(newer) => {
            invalidateDecisionViews(qc, d.id)
            invalidateDecisionViews(qc, newer.id)
            setMode('view')
            onOpenDecision(newer.id)
          }}
          onCancel={() => setMode('view')}
        />
      ) : (
        <>
          {d.context ? (
            <section>
              <h4 className="mb-1 text-[13px] font-medium text-muted">배경</h4>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{d.context}</p>
            </section>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {next.length > 0 ? (
              <Button variant="primary" className="col-span-2" onClick={() => setMode('record')}>
                <CheckIcon size={18} /> 결과 기록
              </Button>
            ) : null}
            {!d.finalized ? (
              <Button className="col-span-2" onClick={() => setMode('edit')}>
                <PencilIcon size={18} /> 제목·배경 수정
              </Button>
            ) : null}
            {d.status === 'ADOPTED' ? (
              <Button className="col-span-2" onClick={() => setMode('redo')}>
                다시 결정하기
              </Button>
            ) : null}
          </div>
          {d.finalized ? <p className="-mt-2 text-xs text-muted">확정된 결정은 고칠 수 없어요. 바꾸려면 다시 결정하기로 새 결정을 남겨요. 이전 이유는 그대로 남습니다.</p> : null}
        </>
      )}

      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        <Fold title="안·투표" count={d.options.length}>
          <Options decision={d} onChanged={(r) => applied(r)} />
        </Fold>
        <Fold title="의견" count={d.commentCount}>
          {(open) => <Comments decision={d} enabled={open} />}
        </Fold>
        <Fold title="연결된 할 일" count={d.taskCount}>
          {(open) => <LinkedTasks decisionId={d.id} enabled={open} />}
        </Fold>
        <Fold title="변경 이력">{(open) => <Activities decisionId={d.id} enabled={open} />}</Fold>
      </div>
    </div>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm">{children}</p>
}

/** 접었다 펴는 구역. 펼칠 때 처음 불러온다. */
function Fold({ title, count, children }: { title: string; count?: number; children: ReactNode | ((open: boolean) => ReactNode) }) {
  const [open, setOpen] = useState(false)
  return (
    <details className="group" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-medium select-none">
        <span className="flex-1">{title}</span>
        {count ? <span className="text-sm text-muted">{count}</span> : null}
        <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="px-4 pb-4">{typeof children === 'function' ? children(open) : children}</div>
    </details>
  )
}

// ---------- 결과 기록·수정·다시 결정 ----------

function RecordOutcome({
  decision,
  statuses,
  onDone,
  onCancel,
}: {
  decision: Decision
  statuses: DecisionStatus[]
  onDone: (d: Decision) => void
  onCancel: () => void
}) {
  const [status, setStatus] = useState<DecisionStatus>(statuses[0])
  const [rationale, setRationale] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [optionId, setOptionId] = useState<number | null>(null)
  const required = needsRationale(status)
  const save = useAction(
    () =>
      API.transitionDecision(decision.id, {
        status,
        optionId: status === 'ADOPTED' ? optionId : null,
        conclusion: conclusion.trim() || null,
        rationale: rationale.trim() || null,
        version: decision.version,
      }),
    { successMessage: '결과를 기록했습니다.', onSuccess: onDone },
  )
  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!required || rationale.trim()) save.mutate(undefined)
      }}
    >
      <Segmented label="결과" value={status} onChange={setStatus} options={statuses.map((s) => ({ value: s, label: DECISION_LABEL[s] }))} />
      <Field label={RATIONALE_LABEL[status] ?? '이유'}>
        <Textarea value={rationale} maxLength={10000} required={required} autoFocus placeholder={RATIONALE_PLACEHOLDER[status]} onChange={(e) => setRationale(e.target.value)} />
      </Field>
      {status === 'ADOPTED' && decision.options.length > 0 ? (
        <Field label="고른 안 (선택)">
          <Select value={optionId ?? ''} onChange={(e) => setOptionId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">고르지 않음</option>
            {decision.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} ({o.voteCount}표)
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {required ? (
        <Field label="결론 한 줄 (선택)">
          <Input value={conclusion} maxLength={10000} placeholder="예: 토스페이먼츠로 붙인다" onChange={(e) => setConclusion(e.target.value)} />
        </Field>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={save.isPending} disabled={required && !rationale.trim()}>
          기록
        </Button>
      </div>
    </form>
  )
}

function EditDecision({ decision, onDone, onCancel }: { decision: Decision; onDone: (d: Decision) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(decision.title)
  const [context, setContext] = useState(decision.context)
  const save = useAction(() => API.updateDecision(decision.id, { title: title.trim(), context: context.trim() || null, version: decision.version }), {
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
      <Field label="무엇을">
        <Input value={title} maxLength={200} required autoFocus onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="배경" hint="이전 문구는 변경 이력에 남아요.">
        <Textarea value={context} maxLength={20000} onChange={(e) => setContext(e.target.value)} />
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

function Redecide({ decision, onDone, onCancel }: { decision: Decision; onDone: (d: Decision) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(decision.title)
  const [context, setContext] = useState('')
  const save = useAction(() => API.supersedeDecision(decision.id, { title: title.trim(), context: context.trim() || null, version: decision.version }), {
    successMessage: '새 결정을 만들었어요. 결과를 기록해 주세요.',
    onSuccess: onDone,
  })
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim()) save.mutate(undefined)
      }}
    >
      <p className="text-sm text-muted">새 결정을 만들고, 이 결정은 “바뀜”으로 남겨 둡니다. 지금의 이유는 지워지지 않아요.</p>
      <Field label="새로 정할 것">
        <Input value={title} maxLength={200} required autoFocus onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="왜 다시 정하나요? (선택)">
        <Textarea value={context} maxLength={20000} placeholder="예: PG 수수료가 5%로 올랐다" onChange={(e) => setContext(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={save.isPending}>
          새 결정 만들기
        </Button>
      </div>
    </form>
  )
}

// ---------- 안·투표 ----------

function Options({ decision, onChanged }: { decision: Decision; onChanged: (d: Decision) => void }) {
  const [title, setTitle] = useState('')
  const add = useAction(() => API.addDecisionOption(decision.id, { title: title.trim() }), {
    onSuccess: (r) => {
      setTitle('')
      onChanged(r)
    },
  })
  const vote = useAction((optionId: number) => (decision.myVoteOptionId === optionId ? API.withdrawVote(decision.id) : API.voteDecision(decision.id, optionId)), {
    onSuccess: onChanged,
  })
  const remove = useAction((o: { id: number; version: number }) => API.removeDecisionOption(decision.id, o.id, o.version), { onSuccess: onChanged })

  return (
    <div className="flex flex-col gap-3">
      {decision.options.length === 0 ? <p className="text-sm text-muted">올라온 안이 없어요. 여러 안을 비교할 때만 쓰면 됩니다.</p> : null}
      <ul className="flex flex-col gap-2">
        {decision.options.map((o) => {
          const mine = decision.myVoteOptionId === o.id
          return (
            <li key={o.id} className={`rounded-xl border p-3 ${o.selected ? 'border-success' : 'border-line'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {o.title} {o.selected ? <Chip tone="success">고른 안</Chip> : null}
                  </p>
                  {o.pros ? <p className="mt-1 text-sm text-muted">장점: {o.pros}</p> : null}
                  {o.cons ? <p className="text-sm text-muted">단점: {o.cons}</p> : null}
                </div>
                {!decision.finalized ? (
                  <IconButton label={`${o.title} 삭제`} onClick={() => remove.mutate({ id: o.id, version: o.version })}>
                    <TrashIcon size={16} />
                  </IconButton>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted">{o.voteCount}표</span>
                {decision.votingOpen ? (
                  <Button size="sm" variant={mine ? 'primary' : 'secondary'} loading={vote.isPending && vote.variables === o.id} onClick={() => vote.mutate(o.id)}>
                    {mine ? '내 표 취소' : '이 안에 투표'}
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {!decision.finalized ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim()) add.mutate(undefined)
          }}
        >
          <Input value={title} maxLength={200} placeholder="안 추가" aria-label="새 안 이름" onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" loading={add.isPending} disabled={!title.trim()} aria-label="안 추가">
            <PlusIcon size={18} />
          </Button>
        </form>
      ) : null}
    </div>
  )
}

// ---------- 의견 ----------

const STANCE_LABEL: Record<Stance, string> = { SUPPORT: '찬성', OPPOSE: '반대', NEUTRAL: '의견' }
const STANCE_TONE: Record<Stance, 'success' | 'danger' | 'neutral'> = { SUPPORT: 'success', OPPOSE: 'danger', NEUTRAL: 'neutral' }

function Comments({ decision, enabled }: { decision: Decision; enabled: boolean }) {
  const qc = useQueryClient()
  const { data, isPending } = useDecisionComments(decision.id, enabled)
  const [stance, setStance] = useState<Stance>('NEUTRAL')
  const [body, setBody] = useState('')
  const write = useAction(() => API.writeDecisionComment(decision.id, { stance, body: body.trim() }), {
    onSuccess: () => {
      setBody('')
      void qc.invalidateQueries({ queryKey: keys.decisionComments(decision.id) })
      void qc.invalidateQueries({ queryKey: keys.decision(decision.id) })
    },
  })
  if (!enabled) return null
  return (
    <div className="flex flex-col gap-3">
      {isPending ? (
        <Spinner />
      ) : data && data.content.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {data.content.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar name={c.author.name} size={26} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex items-center gap-1.5">
                  <span className="font-medium">{c.author.name}</span>
                  <Chip tone={STANCE_TONE[c.stance]}>{STANCE_LABEL[c.stance]}</Chip>
                  <time className="text-xs text-muted" dateTime={c.createdAt}>
                    {relativeTime(c.createdAt)}
                  </time>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">아직 의견이 없어요.</p>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (body.trim()) write.mutate(undefined)
        }}
      >
        <Segmented
          label="입장"
          value={stance}
          onChange={setStance}
          options={(['NEUTRAL', 'SUPPORT', 'OPPOSE'] as Stance[]).map((s) => ({ value: s, label: STANCE_LABEL[s] }))}
        />
        <Textarea value={body} maxLength={5000} className="min-h-16" placeholder="의견을 남겨 주세요" aria-label="의견" onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" loading={write.isPending} disabled={!body.trim()}>
          의견 남기기
        </Button>
      </form>
    </div>
  )
}

// ---------- 연결된 할 일·이력 ----------

function LinkedTasks({ decisionId, enabled }: { decisionId: number; enabled: boolean }) {
  const { data, isPending } = useDecisionTasks(decisionId, enabled)
  if (!enabled) return null
  if (isPending) return <Spinner />
  if (!data || data.content.length === 0) return <p className="text-sm text-muted">할 일을 만들 때 이 결정을 연결하면 여기에 보여요.</p>
  return (
    <ul className="flex flex-col gap-1.5">
      {data.content.map((t) => (
        <li key={t.id} className="flex items-center gap-2 text-sm">
          <Chip tone={t.status === 'DONE' ? 'success' : 'neutral'}>{STATUS_LABEL[t.status]}</Chip>
          <span className={`min-w-0 flex-1 truncate ${t.status === 'CANCELED' ? 'text-muted line-through' : ''}`}>{t.title}</span>
          <span className="shrink-0 text-xs text-muted">{t.nodeTitle}</span>
        </li>
      ))}
    </ul>
  )
}

function Activities({ decisionId, enabled }: { decisionId: number; enabled: boolean }) {
  const { data, isPending } = useDecisionActivities(decisionId, enabled)
  if (!enabled) return null
  if (isPending) return <Spinner />
  return <DecisionActivityList items={data?.content ?? []} />
}
