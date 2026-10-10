import { useState } from 'react'
import type { TreeDecision, TreeNode } from '../../api/types'
import { ChevronDownIcon, ChevronRightIcon } from '../../components/icons'
import { Chip } from '../../components/ui'
import { DECISION_COLOR, DECISION_LABEL } from '../../lib/format'
import { childrenOf, decisionsOf, subtreeDecisionCount, subtreeOpenTasks, subtreeOverdueTasks, type TreeIndex } from '../../lib/tree'

/**
 * 접고 펼치는 트리. 처음에는 두 단계까지 펼친다. 노드를 누르면 노드 상세가 열린다.
 * 노드에 달린 결정은 그 노드 아래 잎으로 보이고, 누르면 결정 상세가 열린다.
 */
export function TreeView({
  index,
  onSelect,
  onSelectDecision,
}: {
  index: TreeIndex
  onSelect: (nodeId: number) => void
  onSelectDecision: (decisionId: number) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    index.byId.forEach((n) => {
      if (n.depth >= 1 && (childrenOf(index, n.id).length > 0 || decisionsOf(index, n.id).length > 0)) initial.add(n.id)
    })
    return initial
  })

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (!index.root) return null

  const indent = (depth: number) => Math.max(depth - 1, 0) * 20

  const renderDecision = (d: TreeDecision, depth: number) => (
    <li key={`d-${d.id}`}>
      <div className="flex items-center" style={{ paddingLeft: indent(depth + 1) }}>
        <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="size-2.5 rotate-45 rounded-[2px]" style={{ background: DECISION_COLOR[d.status] }} />
        </span>
        <button
          onClick={() => onSelectDecision(d.id)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left text-[14px] hover:bg-surface-2"
        >
          <span className={`min-w-0 flex-1 truncate ${d.status === 'SUPERSEDED' ? 'text-muted line-through' : ''}`}>{d.title}</span>
          <span className="shrink-0 text-xs font-medium" style={{ color: DECISION_COLOR[d.status] === 'var(--c-line)' ? 'var(--c-muted)' : DECISION_COLOR[d.status] }}>
            {DECISION_LABEL[d.status]}
          </span>
        </button>
      </div>
    </li>
  )

  const renderNode = (node: TreeNode) => {
    const kids = childrenOf(index, node.id)
    const decisions = decisionsOf(index, node.id)
    const expandable = kids.length > 0 || decisions.length > 0
    const isCollapsed = collapsed.has(node.id)
    // 접힌 노드는 아래 가지까지 합쳐서 보여 준다
    const openTasks = isCollapsed ? subtreeOpenTasks(index, node.id) : node.openTaskCount
    const overdue = isCollapsed ? subtreeOverdueTasks(index, node.id) : node.overdueTaskCount
    const decisionCount = isCollapsed ? subtreeDecisionCount(index, node.id) : 0
    return (
      <li key={node.id}>
        <div className="flex items-center" style={{ paddingLeft: indent(node.depth) }}>
          {node.depth > 0 ? (
            expandable ? (
              <button
                aria-label={isCollapsed ? `${node.title} 펼치기` : `${node.title} 접기`}
                aria-expanded={!isCollapsed}
                onClick={() => toggle(node.id)}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              >
                {isCollapsed ? <ChevronRightIcon size={18} /> : <ChevronDownIcon size={18} />}
              </button>
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="size-1.5 rounded-full bg-line" />
              </span>
            )
          ) : null}
          <button
            onClick={() => onSelect(node.id)}
            className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left hover:bg-surface-2 ${
              node.depth === 0 ? 'py-2 text-[17px] font-semibold' : 'text-[15px]'
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{node.title}</span>
            {overdue > 0 ? <Chip tone="danger">지남 {overdue}</Chip> : null}
            {openTasks > 0 ? <Chip tone="accent">할 일 {openTasks}</Chip> : null}
            {decisionCount > 0 ? <Chip>결정 {decisionCount}</Chip> : null}
          </button>
        </div>
        {expandable && !(isCollapsed && node.depth > 0) ? (
          <ul>
            {decisions.map((d) => renderDecision(d, node.depth))}
            {kids.map(renderNode)}
          </ul>
        ) : null}
      </li>
    )
  }

  return <ul className="rounded-2xl border border-line bg-surface p-2">{renderNode(index.root)}</ul>
}
