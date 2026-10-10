import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ApiError, refreshSession, session } from './api/client'
import { App } from './App'
import { ToastProvider } from './components/toast'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      // 4xx는 다시 시도해도 같다. 네트워크·5xx만 두 번까지.
      retry: (count, error) => count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})

// 로그아웃되면 이전 사용자의 데이터를 화면에서 지운다
session.subscribe(() => {
  if (session.get().status === 'anonymous') queryClient.clear()
})

// 앱을 열면 refresh 쿠키로 로그인을 복구한다
void refreshSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
