import { useSyncExternalStore } from 'react'
import { session, type SessionState } from '../api/client'

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.get, session.get)
}
