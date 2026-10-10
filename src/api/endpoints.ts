import { api, applyAuth, clearSession } from './client'
import type {
  Activity,
  AuthRes,
  Decision,
  DecisionComment,
  DecisionStatus,
  DecisionSummary,
  Invitation,
  Me,
  NodeDetail,
  Page,
  Priority,
  Project,
  ProjectStatus,
  Stance,
  Task,
  TaskStatus,
  Team,
  TeamMember,
  TeamRole,
  Tree,
} from './types'

// ---------- 인증 ----------

export async function login(email: string, password: string): Promise<AuthRes> {
  const res = await api<AuthRes>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })
  applyAuth(res)
  return res
}

export async function register(body: { inviteCode: string; email: string; name: string; password: string }) {
  const res = await api<AuthRes>('/api/auth/register', { method: 'POST', body, auth: false })
  applyAuth(res)
  return res
}

export async function logout() {
  try {
    await api<void>('/api/auth/logout', { method: 'POST', auth: false })
  } finally {
    clearSession()
  }
}

export async function logoutAll() {
  try {
    await api<void>('/api/auth/logout-all', { method: 'POST' })
  } finally {
    clearSession()
  }
}

export const getMe = () => api<Me>('/api/users/me')

// ---------- 팀 ----------

export const getTeam = (teamId: number) => api<Team>(`/api/teams/${teamId}`)

export const renameTeam = (teamId: number, name: string) =>
  api<Team>(`/api/teams/${teamId}`, { method: 'PATCH', body: { name } })

export const changeMemberRole = (teamId: number, userId: number, role: TeamRole) =>
  api<TeamMember>(`/api/teams/${teamId}/members/${userId}`, { method: 'PATCH', body: { role } })

export const removeMember = (teamId: number, userId: number) =>
  api<void>(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' })

export const createInvitation = (teamId: number, body: { role: TeamRole; email?: string; expiresInDays?: number }) =>
  api<Invitation>(`/api/teams/${teamId}/invitations`, { method: 'POST', body })

// ---------- 프로젝트 ----------

export interface ProjectInput {
  name: string
  description: string | null
  color: string | null
}

export const listProjects = (teamId: number, status: ProjectStatus, page = 0, size = 100) =>
  api<Page<Project>>(`/api/teams/${teamId}/projects`, { query: { status, page, size } })

export const createProject = (teamId: number, body: ProjectInput) =>
  api<Project>(`/api/teams/${teamId}/projects`, { method: 'POST', body })

export const getProject = (projectId: number) => api<Project>(`/api/projects/${projectId}`)

export const updateProject = (projectId: number, body: ProjectInput) =>
  api<Project>(`/api/projects/${projectId}`, { method: 'PUT', body })

export const archiveProject = (projectId: number) =>
  api<Project>(`/api/projects/${projectId}/archive`, { method: 'POST' })

export const unarchiveProject = (projectId: number) =>
  api<Project>(`/api/projects/${projectId}/unarchive`, { method: 'POST' })

export const deleteProject = (projectId: number) => api<void>(`/api/projects/${projectId}`, { method: 'DELETE' })

// ---------- 트리·노드 ----------

export const getTree = (projectId: number) => api<Tree>(`/api/projects/${projectId}/tree`)

export const createNode = (projectId: number, body: { parentId: number; title: string; description?: string | null }) =>
  api<NodeDetail>(`/api/projects/${projectId}/nodes`, { method: 'POST', body })

export const getNode = (nodeId: number) => api<NodeDetail>(`/api/nodes/${nodeId}`)

export const updateNode = (nodeId: number, body: { title: string; description: string | null; version: number }) =>
  api<NodeDetail>(`/api/nodes/${nodeId}`, { method: 'PUT', body })

export const moveNode = (nodeId: number, body: { newParentId: number; sortOrder: number; version: number }) =>
  api<NodeDetail>(`/api/nodes/${nodeId}/move`, { method: 'POST', body })

export const deleteNode = (nodeId: number, version: number) =>
  api<void>(`/api/nodes/${nodeId}`, { method: 'DELETE', query: { version } })

// ---------- 할 일 ----------

export const teamQueue = (teamId: number, mine: boolean, limit = 100) =>
  api<Task[]>(`/api/teams/${teamId}/queue`, { query: { mine, limit } })

export const projectQueue = (projectId: number, nodeId: number | null, mine: boolean, limit = 100) =>
  api<Task[]>(`/api/projects/${projectId}/queue`, { query: { nodeId, mine, limit } })

export interface TaskInput {
  nodeId: number
  title: string
  description?: string | null
  priority?: Priority
  dueAt?: string | null
  assigneeId?: number | null
}

export const createTask = (projectId: number, body: TaskInput) =>
  api<Task>(`/api/projects/${projectId}/tasks`, { method: 'POST', body })

export const getTask = (taskId: number) => api<Task>(`/api/tasks/${taskId}`)

export const updateTask = (taskId: number, body: { title: string; description: string | null; version: number }) =>
  api<Task>(`/api/tasks/${taskId}`, { method: 'PUT', body })

export const changePriority = (taskId: number, body: { priority: Priority; reason?: string; version: number }) =>
  api<Task>(`/api/tasks/${taskId}/priority`, { method: 'POST', body })

export const changeStatus = (taskId: number, body: { status: TaskStatus; version: number }) =>
  api<Task>(`/api/tasks/${taskId}/status`, { method: 'POST', body })

export const changeAssignee = (taskId: number, body: { assigneeId: number | null; version: number }) =>
  api<Task>(`/api/tasks/${taskId}/assignee`, { method: 'POST', body })

export const changeDue = (taskId: number, body: { dueAt: string | null; version: number }) =>
  api<Task>(`/api/tasks/${taskId}/due`, { method: 'POST', body })

export const moveTask = (taskId: number, body: { nodeId: number; version: number }) =>
  api<Task>(`/api/tasks/${taskId}/move`, { method: 'POST', body })

export const reorderTask = (
  taskId: number,
  body: { previousTaskId: number | null; nextTaskId: number | null; version: number },
) => api<Task>(`/api/tasks/${taskId}/reorder`, { method: 'POST', body })

export const deleteTask = (taskId: number, version: number) =>
  api<void>(`/api/tasks/${taskId}`, { method: 'DELETE', query: { version } })

export const taskActivities = (taskId: number, page = 0, size = 30) =>
  api<Page<Activity>>(`/api/tasks/${taskId}/activities`, { query: { page, size } })

// ---------- 의사결정 ----------

export interface DecisionInput {
  nodeId: number
  title: string
  context?: string | null
  /** 바로 기록할 결과. 비우면 미정(PROPOSED). */
  status?: DecisionStatus | null
  conclusion?: string | null
  rationale?: string | null
}

export interface TransitionInput {
  status: DecisionStatus
  optionId?: number | null
  conclusion?: string | null
  rationale?: string | null
  version: number
}

export const listDecisions = (
  projectId: number,
  filter: { status?: DecisionStatus | null; nodeId?: number | null } = {},
  page = 0,
  size = 50,
) => api<Page<DecisionSummary>>(`/api/projects/${projectId}/decisions`, { query: { ...filter, page, size } })

export const createDecision = (projectId: number, body: DecisionInput) =>
  api<Decision>(`/api/projects/${projectId}/decisions`, { method: 'POST', body })

export const getDecision = (decisionId: number) => api<Decision>(`/api/decisions/${decisionId}`)

export const updateDecision = (decisionId: number, body: { title: string; context: string | null; version: number }) =>
  api<Decision>(`/api/decisions/${decisionId}`, { method: 'PUT', body })

export const transitionDecision = (decisionId: number, body: TransitionInput) =>
  api<Decision>(`/api/decisions/${decisionId}/transition`, { method: 'POST', body })

export const supersedeDecision = (
  decisionId: number,
  body: { nodeId?: number | null; title: string; context: string | null; version: number },
) => api<Decision>(`/api/decisions/${decisionId}/supersede`, { method: 'POST', body })

export const addDecisionOption = (decisionId: number, body: { title: string; pros?: string | null; cons?: string | null }) =>
  api<Decision>(`/api/decisions/${decisionId}/options`, { method: 'POST', body })

export const removeDecisionOption = (decisionId: number, optionId: number, version: number) =>
  api<Decision>(`/api/decisions/${decisionId}/options/${optionId}`, { method: 'DELETE', query: { version } })

export const voteDecision = (decisionId: number, optionId: number) =>
  api<Decision>(`/api/decisions/${decisionId}/vote`, { method: 'PUT', body: { optionId } })

export const withdrawVote = (decisionId: number) =>
  api<Decision>(`/api/decisions/${decisionId}/vote`, { method: 'DELETE' })

export const decisionComments = (decisionId: number, page = 0, size = 100) =>
  api<Page<DecisionComment>>(`/api/decisions/${decisionId}/comments`, { query: { page, size } })

export const writeDecisionComment = (decisionId: number, body: { optionId?: number | null; stance: Stance; body: string }) =>
  api<DecisionComment>(`/api/decisions/${decisionId}/comments`, { method: 'POST', body })

export const decisionTasks = (decisionId: number, page = 0, size = 50) =>
  api<Page<Task>>(`/api/decisions/${decisionId}/tasks`, { query: { page, size } })

export const decisionActivities = (decisionId: number, page = 0, size = 30) =>
  api<Page<Activity>>(`/api/decisions/${decisionId}/activities`, { query: { page, size } })
