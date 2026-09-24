import { useEffect, type ReactNode } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { Item } from '../types'
import { svgDataUrl } from '../art/garments'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/** Shown next to every simulated AI output. */
export function SimulatedBadge({ className, label = 'Simulated' }: { className?: string; label?: string }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn',
        className,
      )}
      title="Produced by rule-based mock AI, not a real model"
    >
      <Sparkles size={10} strokeWidth={2.5} />
      {label}
    </span>
  )
}

export function ItemImage({ item, className }: { item: Item; className?: string }) {
  if (item.photo)
    return <img src={item.photo} alt={item.name} draggable={false} className={cx('rounded-xl object-contain', className)} />
  return <img src={svgDataUrl(item.imageSvg)} alt={item.name} draggable={false} className={cx('object-contain', className)} />
}

export function Chip({
  active,
  children,
  onClick,
  className,
  size = 'md',
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors duration-150',
        size === 'md' ? 'min-h-11 px-4 text-sm' : 'min-h-9 px-3 text-xs',
        active ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-ink hover:bg-surface-2',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  disabled,
  className,
  active,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
  className?: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:opacity-35',
        active ? 'bg-accent text-on-accent' : 'text-ink hover:bg-surface-2 active:bg-surface-2',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-all duration-150 active:scale-[.98] disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-on-accent shadow-sm',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-ink hover:bg-surface-2',
        variant === 'danger' && 'border border-danger/30 bg-surface text-danger',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Bottom sheet rendered inside the phone frame. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  tall,
  badge,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  tall?: boolean
  badge?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/35" onClick={onClose} />
      <div
        className={cx(
          'anim-sheet relative flex max-h-[92%] flex-col rounded-t-[28px] bg-canvas shadow-2xl',
          tall && 'h-[92%]',
        )}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        {(title || badge) && (
          <div className="flex items-center gap-2 px-5 pb-2 pt-2">
            <h2 className="min-w-0 flex-1 truncate font-display text-xl font-semibold">{title}</h2>
            {badge}
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X size={20} />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line bg-canvas px-5 pb-5 pt-3">{footer}</div>}
      </div>
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h3>
      {right}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium"
    >
      <span className={cx('relative h-6 w-10 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line')}>
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>
      {label}
    </button>
  )
}

export function Swatch({ hex, size = 16, className }: { hex: string; size?: number; className?: string }) {
  return (
    <span
      className={cx('inline-block shrink-0 rounded-full border border-black/10', className)}
      style={{ width: size, height: size, background: hex }}
    />
  )
}
