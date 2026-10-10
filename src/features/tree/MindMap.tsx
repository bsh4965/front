import { hierarchy, tree as d3tree, type HierarchyPointLink, type HierarchyPointNode } from 'd3-hierarchy'
import { select } from 'd3-selection'
import { linkRadial } from 'd3-shape'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TreeNode } from '../../api/types'
import { TargetIcon } from '../../components/icons'
import { Button } from '../../components/ui'
import { childrenOf, subtreeIds, subtreeOpenTasks, subtreeOverdueTasks, type TreeIndex } from '../../lib/tree'

interface Datum {
  node: TreeNode
  hiddenChildren: number
  children?: Datum[]
}

const MAX_LABEL = 12
/** 단계 사이 거리. 폰은 좁아서 줄인다. */
const levelGap = () => (window.matchMedia('(min-width: 768px)').matches ? 130 : 92)

/** 이름표가 차지하는 대략의 폭(글자 + 배지). 화면 맞춤 계산에 쓴다. */
const labelWidth = (title: string) => Math.min(title.length, MAX_LABEL) * 13 + 44

/**
 * 프로젝트 이름을 가운데 고정하고 가지가 방사형으로 뻗는 마인드맵.
 * 핀치·드래그로 확대·이동한다. 원을 누르면 접기/펼치기, 이름을 누르면 노드 상세.
 * 폰에서는 처음에 두 단계까지만 펼친다.
 */
export function MindMap({ index, onSelect }: { index: TreeIndex; onSelect: (nodeId: number) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)

  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const maxDepth = window.matchMedia('(min-width: 768px)').matches ? 2 : 1
    const set = new Set<number>()
    index.byId.forEach((n) => {
      if (n.depth >= maxDepth && childrenOf(index, n.id).length > 0) set.add(n.id)
    })
    return set
  })

  // 보이는 노드만으로 계층을 만든다
  const layout = useMemo(() => {
    if (!index.root) return null
    const build = (node: TreeNode): Datum => {
      const kids = childrenOf(index, node.id)
      if (collapsed.has(node.id)) return { node, hiddenChildren: subtreeIds(index, node.id).size - 1 }
      return { node, hiddenChildren: 0, children: kids.length ? kids.map(build) : undefined }
    }
    const root = hierarchy<Datum>(build(index.root))
    const radius = Math.max(root.height, 1) * levelGap()
    return d3tree<Datum>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / Math.max(a.depth, 1))(root)
  }, [index, collapsed])

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 보이는 노드와 이름표가 모두 들어오도록 확대 비율과 위치를 정한다
  const fitTransform = useCallback(() => {
    if (!layout || !size.width) return zoomIdentity
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const d of layout.descendants()) {
      const angle = d.x - Math.PI / 2
      const x = d.y * Math.cos(angle)
      const y = d.y * Math.sin(angle)
      const w = d.depth === 0 ? Math.min(220, d.data.node.title.length * 15 + 40) / 2 : labelWidth(d.data.node.title)
      const left = d.depth === 0 || x < -1 ? x - w : x - 12
      const right = d.depth === 0 || x >= -1 ? x + w : x + 12
      minX = Math.min(minX, left)
      maxX = Math.max(maxX, right)
      minY = Math.min(minY, y - 24)
      maxY = Math.max(maxY, y + 24)
    }
    const pad = 16
    const scale = Math.max(0.35, Math.min(1.2, (size.width - pad * 2) / (maxX - minX), (size.height - pad * 2 - 56) / (maxY - minY)))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    return zoomIdentity.translate(size.width / 2 - cx * scale, (size.height - 56) / 2 - cy * scale).scale(scale)
  }, [layout, size])

  // 확대·이동. 탭(6px 이하 이동)은 클릭으로 통과시킨다.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !size.width) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .clickDistance(6)
      .on('zoom', (event) => setTransform(event.transform))
    zoomRef.current = behavior
    const selection = select(svg)
    selection.call(behavior).on('dblclick.zoom', null)
    selection.call(behavior.transform, fitTransform())
    return () => {
      selection.on('.zoom', null)
    }
    // 크기가 바뀔 때만 다시 맞춘다. 접고 펼 때는 보던 위치를 유지한다.
  }, [size.width, size.height])

  const recenter = () => {
    const svg = svgRef.current
    if (svg && zoomRef.current) select(svg).call(zoomRef.current.transform, fitTransform())
  }

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const expandAll = () => setCollapsed(new Set())

  const link = linkRadial<HierarchyPointLink<Datum>, HierarchyPointNode<Datum>>()
    .angle((d) => d.x)
    .radius((d) => d.y)

  return (
    <div ref={wrapRef} className="relative h-[calc(100dvh-230px)] min-h-[360px] overflow-hidden rounded-2xl border border-line bg-surface md:h-[calc(100dvh-190px)]">
      <svg ref={svgRef} width={size.width} height={size.height} className="block touch-none select-none" role="img" aria-label="프로젝트 마인드맵">
        {layout ? (
          <g transform={transform.toString()}>
            <g fill="none" stroke="var(--c-line)" strokeWidth={1.5}>
              {layout.links().map((l) => (
                <path key={`${l.source.data.node.id}-${l.target.data.node.id}`} d={link(l) ?? undefined} />
              ))}
            </g>
            {layout.descendants().map((d) => (
              <MindNode key={d.data.node.id} d={d} index={index} onSelect={onSelect} onToggle={toggle} />
            ))}
          </g>
        ) : null}
      </svg>
      <div className="absolute right-3 bottom-3 flex gap-2">
        <Button size="sm" onClick={expandAll}>
          모두 펼치기
        </Button>
        <Button size="sm" onClick={recenter} aria-label="가운데로">
          <TargetIcon size={16} /> 가운데로
        </Button>
      </div>
    </div>
  )
}

function MindNode({
  d,
  index,
  onSelect,
  onToggle,
}: {
  d: HierarchyPointNode<Datum>
  index: TreeIndex
  onSelect: (id: number) => void
  onToggle: (id: number) => void
}) {
  const { node, hiddenChildren } = d.data
  const angle = d.x - Math.PI / 2
  const x = d.y * Math.cos(angle)
  const y = d.y * Math.sin(angle)
  const hasChildren = childrenOf(index, node.id).length > 0
  const openTasks = hiddenChildren > 0 ? subtreeOpenTasks(index, node.id) : node.openTaskCount
  const overdue = hiddenChildren > 0 ? subtreeOverdueTasks(index, node.id) : node.overdueTaskCount
  const label = node.title.length > MAX_LABEL ? `${node.title.slice(0, MAX_LABEL)}…` : node.title

  if (d.depth === 0) {
    const width = Math.max(96, Math.min(220, node.title.length * 15 + 40))
    return (
      <g transform={`translate(${x},${y})`} className="cursor-pointer" onClick={() => onSelect(node.id)}>
        <rect x={-width / 2} y={-22} width={width} height={44} rx={22} fill="var(--c-accent)" />
        <text textAnchor="middle" dy="0.35em" fill="var(--c-on-accent)" fontSize={15} fontWeight={600}>
          {node.title.length > 14 ? `${node.title.slice(0, 14)}…` : node.title}
        </text>
      </g>
    )
  }

  const right = x >= -1
  const labelX = right ? 14 : -14
  const approxWidth = label.length * 14 + 8
  return (
    <g transform={`translate(${x},${y})`}>
      {/* 원: 누르면 접기/펼치기. 손가락으로 누르기 쉽게 보이지 않는 큰 원을 겹친다. */}
      <g
        className={hasChildren ? 'cursor-pointer' : undefined}
        onClick={hasChildren ? () => onToggle(node.id) : () => onSelect(node.id)}
        role={hasChildren ? 'button' : undefined}
        aria-label={hasChildren ? `${node.title} ${hiddenChildren ? '펼치기' : '접기'}` : undefined}
      >
        <circle r={22} fill="transparent" />
        <circle
          r={hiddenChildren ? 8 : 6}
          fill={hiddenChildren ? 'var(--c-surface)' : d.depth === 1 ? 'var(--c-accent)' : 'var(--c-muted)'}
          stroke={hiddenChildren ? 'var(--c-accent)' : 'none'}
          strokeWidth={2}
        />
        {hiddenChildren ? (
          <text textAnchor="middle" dy="0.35em" fontSize={9} fontWeight={700} fill="var(--c-accent)">
            +
          </text>
        ) : null}
      </g>
      {/* 이름: 누르면 상세 */}
      <g className="cursor-pointer" onClick={() => onSelect(node.id)}>
        <rect x={right ? labelX - 4 : labelX - approxWidth + 4} y={-14} width={approxWidth} height={28} fill="transparent" />
        <text x={labelX} dy="0.35em" textAnchor={right ? 'start' : 'end'} fontSize={d.depth === 1 ? 15 : 14} fill="var(--c-fg)" fontWeight={d.depth === 1 ? 600 : 400}>
          {label}
        </text>
        {openTasks > 0 ? (
          <g transform={`translate(${right ? labelX + approxWidth - 4 : labelX - approxWidth - 14}, -9)`}>
            <rect width={22} height={18} rx={9} fill={overdue > 0 ? 'var(--c-danger)' : 'var(--c-accent-soft)'} />
            <text x={11} y={9} dy="0.35em" textAnchor="middle" fontSize={10} fontWeight={700} fill={overdue > 0 ? '#fff' : 'var(--c-accent)'}>
              {openTasks > 99 ? '99+' : openTasks}
            </text>
          </g>
        ) : null}
      </g>
    </g>
  )
}
