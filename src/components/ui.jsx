import { useMemo, useState } from 'react'

export function Section({ number, title, description, children, locked, lockedHint }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${locked ? 'opacity-60' : ''}`}>
      <header className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-mist">{description}</p>}
        </div>
      </header>
      <div className="px-6 py-5">
        {locked ? <p className="text-sm italic text-mist">{lockedHint}</p> : children}
      </div>
    </section>
  )
}

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {hint && <p className="-mt-0.5 mb-2 text-xs text-mist">{hint}</p>}
      {children}
    </div>
  )
}

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

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-navy text-white hover:bg-navy-600 disabled:bg-slate-300',
    secondary: 'border border-navy text-navy bg-white hover:bg-navy/5 disabled:border-slate-300 disabled:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
    danger: 'text-rose-600 hover:bg-rose-50',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

/** Free-text tags with optional suggestions. Enter, comma or "Add" commits a tag. */
export function TagInput({ value = [], onChange, placeholder, suggestions = [], id }) {
  const [draft, setDraft] = useState('')
  const listId = id ? `${id}-list` : undefined

  const commit = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    parts.forEach((p) => {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p)
    })
    onChange(next)
    setDraft('')
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          id={id}
          list={listId}
          className="input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={commit}
        />
        <Button variant="secondary" onClick={commit} disabled={!draft.trim()}>Add</Button>
        {listId && (
          <datalist id={listId}>
            {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </div>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((v) => (
            <li key={v} className="chip chip-on cursor-default">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="ml-1 rounded-full px-1 leading-none hover:bg-white/20"
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Toggle chips for single or multiple choice. `max` caps the number of selections. */
export function ChipGroup({ options, value, onChange, multiple = true, max, searchable = false }) {
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
    <div>
      {searchable && (
        <div className="mb-2 flex items-center gap-3">
          <input className="input max-w-xs" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
          {multiple && selected.length > 0 && (
            <button type="button" className="text-xs font-medium text-mist hover:text-navy" onClick={() => onChange([])}>
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
              aria-pressed={on}
              disabled={!on && atMax}
              className={`chip ${on ? 'chip-on' : ''}`}
              onClick={() => toggle(o)}
            >
              {on && <span aria-hidden>✓</span>}
              {o}
            </button>
          )
        })}
        {visible.length === 0 && <span className="text-sm text-mist">No matches.</span>}
      </div>
      {multiple && max && (
        <p className={`mt-1.5 text-xs ${atMax ? 'font-medium text-navy' : 'text-mist'}`}>
          {selected.length}/{max} selected{atMax ? ' · maximum reached' : ''}
        </p>
      )}
    </div>
  )
}

export function Scale({ value, onChange, lowLabel, highLabel }) {
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? null : n)}
            className={`h-10 w-10 rounded-lg border text-sm font-bold transition ${
              value === n
                ? 'border-navy bg-navy text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex w-[13.5rem] justify-between text-[11px] text-mist">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600',
    ok: 'bg-emerald-100 text-emerald-700',
    warn: 'bg-amber-100 text-amber-700',
    navy: 'bg-navy/10 text-navy',
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}
