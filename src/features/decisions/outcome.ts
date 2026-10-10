import type { DecisionStatus } from '../../api/types'

/** 서버 DecisionStatus.allowedNext와 같다. SUPERSEDED는 "다시 결정하기"로만 간다. */
export const NEXT_STATUSES: Record<DecisionStatus, DecisionStatus[]> = {
  PROPOSED: ['ADOPTED', 'REJECTED', 'DEFERRED', 'DISCUSSING'],
  DISCUSSING: ['ADOPTED', 'REJECTED', 'DEFERRED'],
  DEFERRED: ['ADOPTED', 'REJECTED', 'DISCUSSING'],
  ADOPTED: [],
  REJECTED: [],
  SUPERSEDED: [],
}

/** 이유가 꼭 있어야 하는 결과. */
export const needsRationale = (status: DecisionStatus) => status === 'ADOPTED' || status === 'REJECTED'

export const RATIONALE_LABEL: Partial<Record<DecisionStatus, string>> = {
  ADOPTED: '왜 하기로 했나요?',
  REJECTED: '왜 안 하기로 했나요?',
  DEFERRED: '왜 미루나요? (선택)',
  DISCUSSING: '메모 (선택)',
}

export const RATIONALE_PLACEHOLDER: Partial<Record<DecisionStatus, string>> = {
  ADOPTED: '예: 출시까지 3주라 직접 만들 시간이 없다',
  REJECTED: '예: 사용자가 거의 쓰지 않는다. MVP 범위 밖',
  DEFERRED: '예: 다음 분기 예산이 정해지면 다시 본다',
  DISCUSSING: '예: 팀 의견을 더 모은다',
}
