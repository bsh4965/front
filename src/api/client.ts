import type { ApiResult, AuthRes, UserSummary } from './types'

/**
 * API 호출과 로그인 세션. 규칙은 서버 docs/CLAUDE.md 5절.
 *
 * - access token은 이 모듈의 메모리 변수에만 둔다. localStorage·sessionStorage·쿠키에 저장하지 않는다.
 * - refresh token은 HttpOnly 쿠키(df_refresh)라 JS가 읽지 못한다. 브라우저가 /api/auth로 자동으로 보낸다.
 * - 앱을 열면 refresh로 세션을 복구한다. refresh는 동시에 하나만 나간다(single-flight).
 * - 401 TOKEN_EXPIRED를 받으면 refresh 후 원래 요청을 한 번만 다시 보낸다.
 * - 만료 1분 전에 미리 refresh한다.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly data: unknown

  constructor(status: number, code: string, message: string, data: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.data = data
  }
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

export interface SessionState {
  status: SessionStatus
  user: UserSummary | null
}

let state: SessionState = { status: 'loading', user: null }
const listeners = new Set<() => void>()
let accessToken: string | null = null
let refreshTimer: number | undefined

export const session = {
  get: (): SessionState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

function setState(next: SessionState) {
  state = next
  listeners.forEach((l) => l())
}

export function applyAuth(res: AuthRes) {
  accessToken = res.accessToken
  setState({ status: 'authenticated', user: res.user })
  window.clearTimeout(refreshTimer)
  const delay = Math.max((res.expiresIn - 60) * 1000, 5_000)
  refreshTimer = window.setTimeout(() => void refreshSession(), delay)
}

export function clearSession() {
  accessToken = null
  window.clearTimeout(refreshTimer)
  if (state.status !== 'anonymous') setState({ status: 'anonymous', user: null })
}

// ---------- refresh (single-flight) ----------

let inflight: Promise<boolean> | null = null

export function refreshSession(): Promise<boolean> {
  inflight ??= doRefresh(0).finally(() => {
    inflight = null
  })
  return inflight
}

async function doRefresh(attempt: number): Promise<boolean> {
  let res: Response
  try {
    res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
  } catch {
    if (state.status === 'loading') clearSession()
    return false
  }
  const body = await parse(res)
  if (res.ok && body?.data) {
    applyAuth(body.data as AuthRes)
    return true
  }
  // 여러 탭이 동시에 refresh하면 한쪽이 409를 받는다. 쿠키가 이미 새것으로 바뀌었으니 한 번 더 시도한다.
  if (res.status === 409 && body?.code === 'REFRESH_RACE' && attempt < 1) {
    await new Promise((r) => setTimeout(r, 300))
    return doRefresh(attempt + 1)
  }
  clearSession()
  return false
}

// ---------- 요청 ----------

type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
  /** false면 access token을 붙이지 않고, 401이어도 세션을 지우지 않는다(로그인·가입). */
  auth?: boolean
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, true)
}

async function request<T>(path: string, options: RequestOptions, allowRetry: boolean): Promise<T> {
  const auth = options.auth !== false
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res: Response
  try {
    res = await fetch(withQuery(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.', null)
  }

  const body = await parse(res)
  if (res.ok) return (body?.data ?? null) as T

  const code = body?.code ?? 'UNKNOWN'
  if (res.status === 401 && auth) {
    if (code === 'TOKEN_EXPIRED' && allowRetry && (await refreshSession())) {
      return request<T>(path, options, false)
    }
    clearSession()
  }
  throw new ApiError(res.status, code, body?.message ?? `요청을 처리하지 못했습니다 (${res.status})`, body?.data ?? null)
}

async function parse(res: Response): Promise<ApiResult<unknown> | null> {
  try {
    return (await res.json()) as ApiResult<unknown>
  } catch {
    return null
  }
}

function withQuery(path: string, query?: Query): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}
