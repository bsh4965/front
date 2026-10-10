import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import type { Priority } from '../api/types'
import { initials, PRIORITY_LABEL } from '../lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-2 text-fg hover:bg-line',
  ghost: 'bg-transparent text-fg hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  loading = false,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }) {
  // 터치 타깃 44px 이상(md). sm도 36px.
  const sizing = size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-[15px]'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 ${sizing} ${VARIANT[variant]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : null}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex size-11 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

const fieldBase =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`${fieldBase} h-11 ${className}`} {...rest} />
})

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} min-h-24 py-2.5 leading-relaxed ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} h-11 appearance-none bg-[length:16px] ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="불러오는 중"
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      style={{ width: size, height: size }}
    />
  )
}

export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Spinner /> {label}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {body ? <p className="max-w-xs text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : '불러오지 못했습니다.'
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-sm">
      <p className="text-danger">{message}</p>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      ) : null}
    </div>
  )
}

const PRIORITY_TONE: Record<Priority, string> = {
  P0: 'bg-p0/15 text-p0',
  P1: 'bg-p1/15 text-p1',
  P2: 'bg-p2/12 text-p2',
  P3: 'bg-p3/15 text-p3',
}

export function PriorityBadge({ priority, compact = false }: { priority: Priority; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_TONE[priority]}`}>
      {compact ? priority : `${priority} ${PRIORITY_LABEL[priority]}`}
    </span>
  )
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'warn' }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    accent: 'bg-accent-soft text-accent',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn/15 text-warn',
  }
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  // 이름으로 고정 색을 고른다(같은 사람은 항상 같은 색)
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${hue} 45% 52%)` }}
    >
      {initials(name)}
    </span>
  )
}

/** 탭처럼 고르는 버튼 묶음. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 flex-1 rounded-lg px-3 text-sm font-medium transition ${
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
