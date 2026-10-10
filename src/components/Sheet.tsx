import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from './icons'
import { Button, IconButton } from './ui'

/**
 * 폰에서는 아래에서 올라오는 시트, 넓은 화면에서는 가운데 대화상자.
 * Esc·바깥 누르기로 닫힌다. 열려 있는 동안 뒤 화면 스크롤을 막는다.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-2xl outline-none md:max-h-[85dvh] md:max-w-lg md:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
          <IconButton label="닫기" onClick={onClose} className="-mr-2">
            <XIcon />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer ? <div className="border-t border-line px-5 pt-3 pb-safe md:pb-4">{footer}</div> : <div className="pb-safe" />}
      </div>
    </div>,
    document.body,
  )
}

/** 되돌릴 수 없는 동작 확인. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2 pb-3 md:pb-0">
          <Button className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button className="flex-1" variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-[15px] leading-relaxed text-muted">{body}</div>
    </Sheet>
  )
}
