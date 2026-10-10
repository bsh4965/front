import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as API from '../api/endpoints'
import type { ProjectStatus } from '../api/types'

/** 쿼리 키는 여기에만 둔다. */
export const keys = {
  me: ['me'] as const,
  team: (teamId: number) => ['team', teamId] as const,
  projects: (teamId: number, status: ProjectStatus) => ['projects', teamId, status] as const,
  project: (projectId: number) => ['project', projectId] as const,
  tree: (projectId: number) => ['tree', projectId] as const,
  node: (nodeId: number) => ['node', nodeId] as const,
  teamQueue: (teamId: number, mine: boolean) => ['queue', 'team', teamId, mine] as const,
  projectQueue: (projectId: number, nodeId: number | null, mine: boolean) =>
    ['queue', 'project', projectId, nodeId, mine] as const,
  task: (taskId: number) => ['task', taskId] as const,
  activities: (taskId: number) => ['activities', taskId] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: API.getMe })

export const useTeam = (teamId: number | undefined) =>
  useQuery({ queryKey: keys.team(teamId ?? 0), queryFn: () => API.getTeam(teamId!), enabled: !!teamId })

export const useProjects = (teamId: number | undefined, status: ProjectStatus) =>
  useQuery({
    queryKey: keys.projects(teamId ?? 0, status),
    queryFn: () => API.listProjects(teamId!, status),
    enabled: !!teamId,
  })

export const useProject = (projectId: number) =>
  useQuery({ queryKey: keys.project(projectId), queryFn: () => API.getProject(projectId) })

export const useTree = (projectId: number | undefined) =>
  useQuery({ queryKey: keys.tree(projectId ?? 0), queryFn: () => API.getTree(projectId!), enabled: !!projectId })

export const useNode = (nodeId: number | null) =>
  useQuery({ queryKey: keys.node(nodeId ?? 0), queryFn: () => API.getNode(nodeId!), enabled: !!nodeId })

export const useTeamQueue = (teamId: number | undefined, mine: boolean) =>
  useQuery({
    queryKey: keys.teamQueue(teamId ?? 0, mine),
    queryFn: () => API.teamQueue(teamId!, mine),
    enabled: !!teamId,
  })

export const useProjectQueue = (projectId: number, nodeId: number | null, mine: boolean) =>
  useQuery({
    queryKey: keys.projectQueue(projectId, nodeId, mine),
    queryFn: () => API.projectQueue(projectId, nodeId, mine),
  })

export const useTask = (taskId: number | null) =>
  useQuery({ queryKey: keys.task(taskId ?? 0), queryFn: () => API.getTask(taskId!), enabled: !!taskId })

export const useActivities = (taskId: number | null) =>
  useQuery({
    queryKey: keys.activities(taskId ?? 0),
    queryFn: () => API.taskActivities(taskId!),
    enabled: !!taskId,
  })

/** 할 일이 바뀌면 큐·트리 배지·이력을 다시 읽는다. */
export function invalidateTaskViews(qc: QueryClient, taskId?: number) {
  void qc.invalidateQueries({ queryKey: ['queue'] })
  void qc.invalidateQueries({ queryKey: ['tree'] })
  if (taskId) void qc.invalidateQueries({ queryKey: keys.activities(taskId) })
}

/** 노드·프로젝트가 바뀌면 트리·목록·큐를 다시 읽는다. */
export function invalidateProjectViews(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['tree'] })
  void qc.invalidateQueries({ queryKey: ['projects'] })
  void qc.invalidateQueries({ queryKey: ['project'] })
  void qc.invalidateQueries({ queryKey: ['queue'] })
  void qc.invalidateQueries({ queryKey: ['node'] })
}

export { useQueryClient }
