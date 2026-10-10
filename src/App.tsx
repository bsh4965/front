import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppShell } from './components/AppShell'
import { Loading } from './components/ui'
import { useMe } from './hooks/queries'
import { LoginPage } from './pages/LoginPage'
import { MePage } from './pages/MePage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { QueuePage } from './pages/QueuePage'
import { RegisterPage } from './pages/RegisterPage'
import { TeamPage } from './pages/TeamPage'
import { useSession } from './state/session'
import { TeamProvider } from './state/team'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route
        element={
          <RequireAuth>
            <TeamProvider>
              <RequireTeam>
                <AppShell />
              </RequireTeam>
            </TeamProvider>
          </RequireAuth>
        }
      >
        <Route index element={<QueuePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="me" element={<MePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <img src="/favicon.svg" alt="" className="size-14 rounded-2xl" />
      <Loading label="로그인 확인 중" />
    </div>
  )
}

/** 로그인해야 보는 화면. 앱을 열 때 refresh로 세션을 복구하는 동안은 기다린다. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useSession()
  if (status === 'loading') return <Splash />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <>{children}</>
}

/** 내 정보와 소속 팀을 읽은 뒤에 화면을 그린다. */
function RequireTeam({ children }: { children: ReactNode }) {
  const { data: me, isPending, error } = useMe()
  if (isPending) return <Splash />
  if (error || !me) return <p className="p-8 text-center text-sm text-danger">{error?.message ?? '내 정보를 불러오지 못했습니다.'}</p>
  if (me.teams.length === 0) {
    return <p className="p-8 text-center text-sm text-muted">속한 팀이 없습니다. 팀 관리자에게 초대를 요청하세요.</p>
  }
  return <>{children}</>
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">페이지를 찾을 수 없어요</p>
      <Link to="/" className="text-accent">
        처음으로
      </Link>
    </div>
  )
}
