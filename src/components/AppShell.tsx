import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useCurrentTeam } from '../state/team'
import { FolderIcon, QueueIcon, UserIcon, UsersIcon } from './icons'

const TABS = [
  { to: '/', label: '큐', icon: QueueIcon, end: true },
  { to: '/projects', label: '프로젝트', icon: FolderIcon, end: false },
  { to: '/team', label: '팀', icon: UsersIcon, end: false },
  { to: '/me', label: '나', icon: UserIcon, end: false },
]

/**
 * 폰: 위 제목 + 아래 탭 바(홈 바 여백 포함). 넓은 화면: 왼쪽 사이드바.
 */
export function AppShell() {
  const { team, teams, setTeamId } = useCurrentTeam()

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="text-[17px] font-semibold">DecisionFlow</span>
        </div>
        {teams.length > 1 ? (
          <select
            aria-label="팀 선택"
            className="mb-4 h-10 rounded-xl border border-line bg-surface px-3 text-sm"
            value={team?.teamId}
            onChange={(e) => setTeamId(Number(e.target.value))}
          >
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="mb-4 px-2 text-sm text-muted">{team?.name}</p>
        )}
        <nav className="flex flex-col gap-1">
          {TABS.map(({ to, label, icon: TabIcon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              <TabIcon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-safe backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-4">
          {TABS.map(({ to, label, icon: TabIcon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <TabIcon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/** 각 화면 위쪽 제목줄. 폰에서는 노치 여백을 둔다. */
export function PageHeader({
  title,
  subtitle,
  leading,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 pt-safe backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-2 px-safe py-2">
        {leading}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-semibold">{title}</h1>
          {subtitle ? <p className="truncate text-[13px] text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  )
}

export function PageBody({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto px-safe py-4 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>{children}</div>
}
