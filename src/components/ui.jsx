import { forwardRef, useId, useMemo, useState } from 'react'

// ---------- icons ----------

export function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10l4 4 8-8" />
    </svg>
  )
}

export function ChevronIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 5l6 5-6 5" />
    </svg>
  )
}

// ---------- layout ----------

/**
 * Numbered step card. `state`: 'active' (default) | 'done' | 'locked'.
 * Pass `number` for the form steps; omit it for plain titled panels (admin page).
 */
export function Section({ number, title, description, children, locked, lockedHint, done, id }) {
  const state = locked ? 'locked' : done ? 'done' : 'active'
  const circle = {
    done: 'bg-navy text-white',
    active: 'bg-cyan text-navy ring-4 ring-cyan/25',
    locked: 'border-2 border-mist-300 bg-white text-mist',
  }[state]
  return (
    <section
      id={id}
      className={`scroll-mt-16 rounded-2xl border bg-white transition ${
        locked
          ? 'border-dashed border-mist-300 bg-paper/60'
          : 'border-mist-200 shadow-[0_1px_2px_rgba(27,30,66,0.06),0_8px_24px_-12px_rgba(27,30,66,0.18)]'
      }`}
      aria-disabled={locked || undefined}
    >
      <header className="flex items-start gap-4 border-b border-mist-100 px-4 py-4 sm:px-6 sm:py-5">
        {number != null && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${circle}`} aria-hidden>
            {state === 'done' ? <CheckIcon className="h-4 w-4" /> : number}
          </span>
        )}
        <div className="min-w-0">
          <h2 className={`text-xl font-bold tracking-tight ${locked ? 'text-mist' : 'text-navy'}`}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink">{description}</p>}
        </div>
      </header>
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        {locked ? <p className="text-sm text-mist">{lockedHint}</p> : children}
      </div>
    </section>
  )
}

/**
 * Label + hint + control. The control area is a labelled group, so screen readers announce the
 * question for chip/option groups too. `eyebrow` renders a small cyan tag above the label.
 */
export function Field({ label, hint, required, eyebrow, error, children, className = '' }) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      {eyebrow && (
        <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-navy">
          <span className="h-3 w-0.5 rounded-full bg-cyan" aria-hidden />
          {eyebrow}
        </span>
      )}
      <p id={labelId} className={`mb-1.5 font-semibold ${eyebrow ? 'text-[15px] leading-snug text-navy' : 'text-sm text-navy'}`}>
        {label}
        {required && <span className="text-rose-600" aria-hidden> *</span>}
      </p>
      {hint && (
        <p id={hintId} className="-mt-0.5 mb-2 text-sm text-ink">
          {hint}
        </p>
      )}
      <div role="group" aria-labelledby={labelId} aria-describedby={hintId}>
        {children}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}

export const Notice = forwardRef(function Notice({ tone = 'info', title, children, className = '', ...rest }, ref) {
  const tones = {
    info: 'border-mist bg-paper text-ink',
    success: 'border-cyan bg-cyan-50 text-navy',
    error: 'border-rose-500 bg-rose-50 text-rose-800',
  }
  return (
    <div ref={ref} className={`rounded-lg border-l-4 px-4 py-3 text-sm ${tones[tone]} ${className}`} {...rest}>
      {title && <p className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>}
      {children}
    </div>
  )
})

// ---------- controls ----------

export function TextInput({ className = '', ...props }) {
  return <input type="text" className={`input ${className}`} {...props} />
}

export function Textarea(props) {
  return <textarea className="input min-h-[96px] resize-y" {...props} />
}

export function Select({ options, placeholder = 'Select…', value, onChange, ...rest }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const styles = {
    primary: 'bg-navy text-white shadow-sm hover:bg-navy-600 disabled:bg-mist-300 disabled:shadow-none',
    secondary: 'border border-mist-300 bg-white text-navy hover:border-cyan hover:text-cyan-600 disabled:border-mist-200 disabled:text-mist',
    ghost: 'text-ink hover:bg-mist-100 hover:text-navy disabled:text-mist',
    onDark: 'text-white/80 hover:bg-white/10 hover:text-white',
    danger: 'text-rose-600 hover:bg-rose-50',
  }
  const sizes = {
    sm: 'min-h-9 px-2.5 py-1 text-xs',
    md: 'min-h-11 px-4 py-2 text-sm',
    lg: 'min-h-12 px-6 py-3 text-base',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}


/** Toggle chips for single or multiple choice with SHORT labels. `max` caps the number of selections. */
export function ChipGroup({ options, value, onChange, multiple = true, max, searchable = false, filterPlaceholder = 'Filter…', renderLabel }) {
  const [q, setQ] = useState('')
  const selected = multiple ? value || [] : value ? [value] : []
  const visible = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options),
    [options, q],
  )
  const atMax = Boolean(multiple && max && selected.length >= max)

  const toggle = (o) => {
    if (!multiple) return onChange(value === o ? '' : o)
    if (selected.includes(o)) return onChange(selected.filter((x) => x !== o))
    if (atMax) return
    onChange([...selected, o])
  }

  return (
    <div role={multiple ? 'group' : 'radiogroup'}>
      {searchable && (
        <div className="mb-2 flex items-center gap-3">
          <input className="input max-w-xs" placeholder={filterPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={filterPlaceholder} />
          {multiple && selected.length > 0 && (
            <button type="button" className="inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium text-ink hover:text-navy" onClick={() => onChange([])}>
              Clear ({selected.length})
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {visible.map((o) => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              role={multiple ? undefined : 'radio'}
              aria-pressed={multiple ? on : undefined}
              aria-checked={multiple ? undefined : on}
              aria-disabled={!on && atMax ? true : undefined}
              className={`chip ${on ? 'chip-on' : ''}`}
              onClick={() => toggle(o)}
            >
              {on && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-cyan-600" />}
              {renderLabel ? renderLabel(o, on) : o}
            </button>
          )
        })}
        {visible.length === 0 && <span className="text-sm text-ink">No matches.</span>}
      </div>
      {multiple && (max || selected.length > 0) && (
        <p className={`mt-1.5 text-xs ${atMax ? 'font-medium text-navy' : 'text-ink'}`}>
          {max ? `${selected.length}/${max} selected${atMax ? ' · maximum reached' : ''}` : `${selected.length} selected`}
        </p>
      )}
    </div>
  )
}

/**
 * Stacked, radio/checkbox-style rows for options with LONG labels (full sentences).
 * Text in parentheses is rendered as a lighter note under the main label.
 */
export function OptionList({ options, value, onChange, multiple = false, max, columns = 1 }) {
  const selected = multiple ? value || [] : value ? [value] : []
  const atMax = Boolean(multiple && max && selected.length >= max)
  const split = (o) => {
    const m = o.match(/^(.*?)\s*\((.*)\)$/)
    return m ? [m[1], m[2]] : [o, null]
  }
  const toggle = (o) => {
    if (!multiple) return onChange(value === o ? '' : o)
    if (selected.includes(o)) return onChange(selected.filter((x) => x !== o))
    if (atMax) return
    onChange([...selected, o])
  }
  return (
    <div>
      <div role={multiple ? 'group' : 'radiogroup'} className={`grid gap-2 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>
        {options.map((o) => {
          const on = selected.includes(o)
          const disabled = !on && atMax
          const [main, note] = split(o)
          return (
            <button
              key={o}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={on}
              disabled={disabled}
              onClick={() => toggle(o)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                on ? 'border-cyan-600 bg-cyan-50' : 'border-mist-300 bg-white hover:border-cyan hover:bg-cyan-50/50'
              } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-mist-300 disabled:hover:bg-white`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 ${multiple ? 'rounded' : 'rounded-full'} ${
                  on ? 'border-navy bg-navy text-white' : 'border-mist-300 bg-white'
                }`}
              >
                {on && (multiple ? <CheckIcon className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-white" />)}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm leading-snug ${on ? 'font-semibold text-navy' : 'font-medium text-navy'}`}>{main}</span>
                {note && <span className="block text-xs leading-snug text-ink">{note}</span>}
              </span>
            </button>
          )
        })}
      </div>
      {multiple && max && (
        <p className={`mt-1.5 text-xs ${atMax ? 'font-medium text-navy' : 'text-ink'}`}>
          {selected.length}/{max} selected{atMax ? ' · maximum reached' : ''}
        </p>
      )}
    </div>
  )
}


export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-mist-100 text-ink',
    navy: 'bg-navy/10 text-navy',
    cyan: 'bg-cyan/15 text-navy',
  }
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${tones[tone] || tones.neutral}`}>{children}</span>
}
