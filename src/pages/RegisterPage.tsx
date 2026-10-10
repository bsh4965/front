import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import * as API from '../api/endpoints'
import { Button, Field, Input } from '../components/ui'
import { AuthLayout } from './LoginPage'

/** 초대 코드로 가입. 초대 링크(/register?code=...)로 들어오면 코드가 미리 채워진다. */
export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ inviteCode: params.get('code') ?? '', email: '', name: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 10) {
      setError('비밀번호는 10자 이상이어야 합니다.')
      return
    }
    setPending(true)
    try {
      await API.register({ ...form, inviteCode: form.inviteCode.trim() })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '가입하지 못했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="팀에 가입" subtitle="팀 관리자에게 받은 초대 코드가 필요해요">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="초대 코드">
          <Input required autoCapitalize="off" autoCorrect="off" spellCheck={false} value={form.inviteCode} onChange={set('inviteCode')} />
        </Field>
        <Field label="이메일" hint="초대에 이메일이 정해져 있으면 같은 이메일이어야 해요.">
          <Input type="email" autoComplete="email" inputMode="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="이름">
          <Input autoComplete="name" required maxLength={100} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="비밀번호" hint="10~64자">
          <Input type="password" autoComplete="new-password" required minLength={10} maxLength={64} value={form.password} onChange={set('password')} />
        </Field>
        {error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" loading={pending}>
          가입하고 시작하기
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-medium text-accent">
          로그인
        </Link>
      </p>
    </AuthLayout>
  )
}
