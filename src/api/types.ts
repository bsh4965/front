// 서버 DTO와 같은 모양. 서버 Swagger(/v3/api-docs)가 기준이다.

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED'
export type DecisionStatus = 'PROPOSED' | 'DISCUSSING' | 'ADOPTED' | 'REJECTED' | 'DEFERRED' | 'SUPERSEDED'

/** 모든 응답 본문. HTTP 상태는 code의 상태와 같다. */
export interface ApiResult<T> {
  success: boolean
  code: string
  message: string
  data: T
}

export interface UserSummary {
  id: number
  email: string
  name: string
  avatarUrl: string | null
}

export interface AuthRes {
  accessToken: string
  tokenType: string
  expiresIn: number
  expiresAt: string
  user: UserSummary
}

export interface MyTeam {
  teamId: number
  name: string
  role: TeamRole
}

export interface Me {
  user: UserSummary
  teams: MyTeam[]
}

export interface TeamMember {
  userId: number
  email: string
  name: string
  role: TeamRole
  joinedAt: string
}

export interface Team {
  id: number
  name: string
  myRole: TeamRole
  members: TeamMember[]
}

export interface Invitation {
  id: number
  code: string
  role: TeamRole
  email: string | null
  expiresAt: string
}

export interface Project {
  id: number
  teamId: number
  name: string
  description: string | null
  color: string | null
  status: ProjectStatus
  rootNodeId: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TreeNode {
  id: number
  parentId: number | null
  title: string
  depth: number
  sortOrder: number
  version: number
  openTaskCount: number
  overdueTaskCount: number
  decisionCounts: Partial<Record<DecisionStatus, number>>
}

/** 마인드맵·트리에서 노드 끝에 붙는 결정(잎). */
export interface TreeDecision {
  id: number
  nodeId: number
  title: string
  status: DecisionStatus
}

export interface Tree {
  project: Project
  nodes: TreeNode[]
  decisions: TreeDecision[]
}

export interface NodeDetail {
  id: number
  projectId: number
  parentId: number | null
  title: string
  description: string | null
  depth: number
  sortOrder: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: number
  projectId: number
  projectName: string
  nodeId: number
  nodeTitle: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  dueAt: string | null
  assignee: UserSummary | null
  decisionId: number | null
  completedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: number
  action: string
  actor: UserSummary
  changes: Record<string, { from: unknown; to: unknown }>
  reason: string | null
  createdAt: string
}

export type Stance = 'SUPPORT' | 'OPPOSE' | 'NEUTRAL'

export interface DecisionOption {
  id: number
  title: string
  description: string | null
  pros: string | null
  cons: string | null
  proposedBy: UserSummary
  sortOrder: number
  voteCount: number
  selected: boolean
  version: number
  createdAt: string
}

export interface Decision {
  id: number
  projectId: number
  nodeId: number
  nodeTitle: string
  title: string
  context: string
  status: DecisionStatus
  finalized: boolean
  votingOpen: boolean
  options: DecisionOption[]
  selectedOptionId: number | null
  conclusion: string | null
  rationale: string | null
  decidedBy: UserSummary | null
  decidedAt: string | null
  supersedesId: number | null
  supersededById: number | null
  myVoteOptionId: number | null
  voteCount: number
  commentCount: number
  taskCount: number
  createdBy: UserSummary
  version: number
  createdAt: string
  updatedAt: string
}

export interface DecisionSummary {
  id: number
  nodeId: number
  nodeTitle: string
  title: string
  status: DecisionStatus
  conclusion: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DecisionComment {
  id: number
  decisionId: number
  optionId: number | null
  author: UserSummary
  stance: Stance
  body: string
  createdAt: string
  updatedAt: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  hasNext: boolean
}
