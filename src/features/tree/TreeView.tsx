import { useState } from 'react'
import type { TreeNode } from '../../api/types'
import { ChevronDownIcon, ChevronRightIcon } from '../../components/icons'
import { Chip } from '../../components/ui'
import { childrenOf, decisionTotal, subtreeOpenTasks, subtreeOverdueTasks, type TreeIndex } from '../../lib/tree'

/** 접고 펼치는 트리. 처음에는 두 단계까지 펼친다. 노드를 누르면 상세가 열린다. */
export function TreeView({ index, onSelect }: { index: TreeIndex; onSelect: (nodeId: number) => void }) {
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    index.byId.forEach((n) => {
      if (n.depth >= 1 && childrenOf(index, n.id).length > 0) initial.add(n.id)
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

  const renderNode = (node: TreeNode) => {
    const kids = childrenOf(index, node.id)
    const isCollapsed = collapsed.has(node.id)
    // 접힌 노드는 아래 가지까지 합쳐서 보여 준다
    const openTasks = isCollapsed ? subtreeOpenTasks(index, node.id) : node.openTaskCount
    const overdue = isCollapsed ? subtreeOverdueTasks(index, node.id) : node.overdueTaskCount
    const decisions = decisionTotal(node)
    return (
      <li key={node.id}>
        <div className="flex items-center" style={{ paddingLeft: Math.max(node.depth - 1, 0) * 20 }}>
          {node.depth > 0 ? (
            kids.length > 0 ? (
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
            {decisions > 0 ? <Chip>결정 {decisions}</Chip> : null}
          </button>
        </div>
        {kids.length > 0 && !isCollapsed ? <ul>{kids.map(renderNode)}</ul> : null}
      </li>
    )
  }

  return <ul className="rounded-2xl border border-line bg-surface p-2">{renderNode(index.root)}</ul>
}
