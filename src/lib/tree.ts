import type { TreeNode } from '../api/types'

/** 서버가 준 평탄한 노드 배열(부모가 자식보다 먼저, 형제는 순서대로)을 트리로 쓰기 좋게 묶는다. */
export interface TreeIndex {
  root: TreeNode | undefined
  byId: Map<number, TreeNode>
  children: Map<number, TreeNode[]>
}

export function indexTree(nodes: TreeNode[]): TreeIndex {
  const byId = new Map<number, TreeNode>()
  const children = new Map<number, TreeNode[]>()
  let root: TreeNode | undefined
  for (const node of nodes) {
    byId.set(node.id, node)
    if (node.parentId === null) {
      root = node
    } else {
      const list = children.get(node.parentId) ?? []
      list.push(node)
      children.set(node.parentId, list)
    }
  }
  return { root, byId, children }
}

export function childrenOf(index: TreeIndex, id: number): TreeNode[] {
  return index.children.get(id) ?? []
}

/** 노드 자신과 모든 자손의 id. 이동할 때 고를 수 없는 부모 후보다. */
export function subtreeIds(index: TreeIndex, id: number): Set<number> {
  const result = new Set<number>([id])
  const stack = [id]
  while (stack.length) {
    const current = stack.pop()!
    for (const child of childrenOf(index, current)) {
      result.add(child.id)
      stack.push(child.id)
    }
  }
  return result
}

/** 루트부터 그 노드까지의 제목. 루트(프로젝트명)는 뺀다. */
export function pathTitles(index: TreeIndex, id: number): string[] {
  const titles: string[] = []
  let current = index.byId.get(id)
  while (current && current.parentId !== null) {
    titles.unshift(current.title)
    current = index.byId.get(current.parentId)
  }
  return titles
}

/** 선택 목록용. 트리 순서(깊이 우선)로 펼친다. */
export function flatten(index: TreeIndex, exclude?: Set<number>): TreeNode[] {
  const out: TreeNode[] = []
  const visit = (node: TreeNode) => {
    if (exclude?.has(node.id)) return
    out.push(node)
    childrenOf(index, node.id).forEach(visit)
  }
  if (index.root) visit(index.root)
  return out
}

/** 이 노드와 아래 가지의 열린 할 일 수 합. 접힌 노드에 보여 준다. */
export function subtreeOpenTasks(index: TreeIndex, id: number): number {
  let sum = 0
  for (const nodeId of subtreeIds(index, id)) sum += index.byId.get(nodeId)?.openTaskCount ?? 0
  return sum
}

/** 이 노드와 아래 가지의 마감 지난 할 일 수 합. */
export function subtreeOverdueTasks(index: TreeIndex, id: number): number {
  let sum = 0
  for (const nodeId of subtreeIds(index, id)) sum += index.byId.get(nodeId)?.overdueTaskCount ?? 0
  return sum
}

export function decisionTotal(node: TreeNode): number {
  return Object.values(node.decisionCounts).reduce((a, b) => a + (b ?? 0), 0)
}
