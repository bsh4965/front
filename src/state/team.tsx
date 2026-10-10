import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MyTeam } from '../api/types'
import { useMe } from '../hooks/queries'

const STORAGE_KEY = 'df.teamId'

interface CurrentTeam {
  team: MyTeam | undefined
  teams: MyTeam[]
  setTeamId: (teamId: number) => void
  canManage: boolean
}

const TeamContext = createContext<CurrentTeam | null>(null)

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

/** 지금 보고 있는 팀. 여러 팀에 속하면 고를 수 있고, 고른 팀은 이 기기에 기억한다(화면 편의용). */
export function TeamProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMe()
  const [selected, setSelected] = useState<number | null>(readStored)

  const setTeamId = useCallback((teamId: number) => {
    setSelected(teamId)
    try {
      localStorage.setItem(STORAGE_KEY, String(teamId))
    } catch {
      // 저장할 수 없어도 이번 세션에서는 동작한다
    }
  }, [])

  const value = useMemo<CurrentTeam>(() => {
    const teams = me?.teams ?? []
    const team = teams.find((t) => t.teamId === selected) ?? teams[0]
    return { team, teams, setTeamId, canManage: team?.role === 'OWNER' || team?.role === 'ADMIN' }
  }, [me, selected, setTeamId])

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useCurrentTeam(): CurrentTeam {
  const value = useContext(TeamContext)
  if (!value) throw new Error('TeamProvider가 없습니다')
  return value
}
