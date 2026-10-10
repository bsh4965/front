import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import * as API from '../api/endpoints'
import { Button, Field, Input } from '../components/ui'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-start justify-center px-5 pt-[calc(env(safe-area-inset-top)+12vh)] pb-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/favicon.svg" alt="" className="size-14 rounded-2xl" />
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await API.login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인하지 못했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="DecisionFlow" subtitle="팀 할 일과 의사결정을 한곳에서">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="이메일">
          <Input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="비밀번호">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" loading={pending}>
          로그인
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        초대 코드를 받으셨나요?{' '}
        <Link to="/register" className="font-medium text-accent">
          가입하기
        </Link>
      </p>
    </AuthLayout>
  )
}
