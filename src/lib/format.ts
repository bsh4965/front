import type { DecisionStatus, Priority, TaskStatus, TeamRole } from '../api/types'

export const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3']

export const PRIORITY_LABEL: Record<Priority, string> = {
  P0: '긴급',
  P1: '높음',
  P2: '보통',
  P3: '낮음',
}

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELED']

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: '할 일',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
  CANCELED: '취소',
}

export const ROLE_LABEL: Record<TeamRole, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '멤버',
}

export const DECISION_LABEL: Record<DecisionStatus, string> = {
  PROPOSED: '제안',
  DISCUSSING: '논의 중',
  ADOPTED: '채택',
  REJECTED: '기각',
  DEFERRED: '보류',
  SUPERSEDED: '대체됨',
}

const DAY = 24 * 60 * 60 * 1000

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal'

/** 마감 표시. 지남 / 오늘 / 내일 / 이번 주 / 날짜. */
export function formatDue(iso: string, now = new Date()): { text: string; tone: DueTone } {
  const due = new Date(iso)
  const time = due.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (due.getTime() < now.getTime()) {
    const days = Math.floor((startOfDay(now) - startOfDay(due)) / DAY)
    return { text: days <= 0 ? `오늘 ${time} 지남` : `${days}일 지남`, tone: 'overdue' }
  }
  const diffDays = Math.round((startOfDay(due) - startOfDay(now)) / DAY)
  if (diffDays === 0) return { text: `오늘 ${time}`, tone: 'today' }
  if (diffDays === 1) return { text: `내일 ${time}`, tone: 'soon' }
  if (diffDays < 7) {
    return { text: due.toLocaleDateString('ko-KR', { weekday: 'short' }) + ` ${time}`, tone: 'soon' }
  }
  return { text: `${due.getMonth() + 1}월 ${due.getDate()}일`, tone: 'normal' }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

/** <input type="datetime-local">용 값(로컬 시각). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local 값(로컬 시각)을 서버로 보낼 UTC ISO 문자열로. 비어 있으면 null. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  return new Date(value).toISOString()
}

export function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  // 한글 이름은 성을 뺀 두 글자, 영문은 앞 글자 둘
  if (/^[가-힣]+$/.test(trimmed)) return trimmed.length >= 3 ? trimmed.slice(1, 3) : trimmed
  return trimmed
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
