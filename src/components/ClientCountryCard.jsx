import {
  SERVICES, SERVICE_OTHER, STAKEHOLDERS, MATURITY, OFFICE_TYPES, IMPORTANCE, DECISION_LEVELS,
  GAPS, MAX_GAPS, REASONS, OTHER_SPECIFY, QUESTIONS,
} from '../data/constants'
import { useId } from 'react'
import { Field, ChipGroup, OptionList, Select, Textarea, TextInput, Badge, Button, ChevronIcon } from './ui'

export const NO_GAP = 'No clear gap'
export const ANSWER_FIELDS = ['services', 'stakeholders', 'maturity', 'officeType', 'importance', 'decisions', 'gaps', 'reasons', 'action']
const Q_OF = { services: 'Q6', stakeholders: 'Q7', maturity: 'Q8', officeType: 'Q9', importance: 'Q10', decisions: 'Q11', gaps: 'Q12', reasons: 'Q13', action: 'Q14' }

/** Question labels (Q6…Q14) still unanswered in this card. */
export function missing(a) {
  if (!a) return ANSWER_FIELDS.map((f) => Q_OF[f])
  const blank = (t) => !t || !String(t).trim()
  return ANSWER_FIELDS.filter((f) => {
    const v = a[f]
    if (f === 'services') return !v?.length || (v.includes(SERVICE_OTHER) && blank(a.serviceOther))
    if (f === 'gaps') return !v?.length || (v.includes(OTHER_SPECIFY) && blank(a.gapOther))
    if (f === 'reasons') {
      const need = (a.gaps || []).filter((g) => g !== NO_GAP)
      const r = v || {}
      if (!(a.gaps || []).length || !need.every((g) => r[g])) return true
      return need.some((g) => r[g] === OTHER_SPECIFY) && blank(a.reasonOther)
    }
    if (Array.isArray(v)) return v.length === 0
    if (typeof v === 'string') return v.trim() === ''
    return v == null
  }).map((f) => Q_OF[f])
}

export function completion(a) {
  return ANSWER_FIELDS.length - missing(a).length
}

export const cardId = (key) => `card-${key.replace(/[^a-z0-9]/gi, '-')}`

const short = (s) => s.replace(/\s*\(.*\)\s*$/, '')

export default function ClientCountryCard({ client, region, country, answer, onChange, id, open, onToggle, onNext, hasNext }) {
  const panelId = useId()
  const total = ANSWER_FIELDS.length
  const left = missing(answer)
  const done = total - left.length
  const set = (patch) => onChange(patch)

  const setGaps = (next) => {
    const hadNoGap = (answer.gaps || []).includes(NO_GAP)
    let gaps = next
    if (gaps.includes(NO_GAP) && !hadNoGap) gaps = [NO_GAP] // "No clear gap" is exclusive
    else if (hadNoGap && gaps.length > 1) gaps = gaps.filter((g) => g !== NO_GAP) // picking a real gap drops it
    const reasons = Object.fromEntries(Object.entries(answer.reasons || {}).filter(([g]) => gaps.includes(g)))
    set({ gaps, reasons })
  }
  const setReason = (gap, reason) => set({ reasons: { ...(answer.reasons || {}), [gap]: reason } })
  const anyOtherReason = Object.values(answer.reasons || {}).some((r) => r === OTHER_SPECIFY)
  const gapsNeedingReason = (answer.gaps || []).filter((g) => g !== NO_GAP)

  return (
    <article id={id} className={`scroll-mt-6 overflow-hidden rounded-xl border bg-white ${open ? 'border-navy/40 shadow-sm' : 'border-mist-200'}`}>
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-paper sm:px-5"
        >
        <ChevronIcon className={`h-4 w-4 shrink-0 text-mist transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="min-w-0 flex-1">
          <span className="font-bold text-navy">{client}</span>
          <span className="mx-2 text-mist-300">/</span>
          <span className="font-medium text-ink">{country}</span>
          {region && <span className="ml-2 text-xs text-ink">{region}</span>}
        </span>
        <Badge tone={done === total ? 'ok' : done > 0 ? 'warn' : 'neutral'}>{done}/{total} answered</Badge>
        </button>
      </h3>
      <div className="h-1 bg-mist-100" aria-hidden>
        <div className={`h-full transition-all ${done === total ? 'bg-emerald-500' : 'bg-cyan'}`} style={{ width: `${(done / total) * 100}%` }} />
      </div>

      {open && (
        <div id={panelId} className="space-y-7 border-t border-mist-100 px-4 py-5 sm:px-6 sm:py-6">
          <Field eyebrow="Question 6" label={QUESTIONS.q6} hint="Select all that apply. Type to filter the list.">
            <ChipGroup options={SERVICES} value={answer.services} onChange={(v) => set({ services: v })} searchable filterPlaceholder="Search services…" />
            {answer.services.includes(SERVICE_OTHER) && (
              <TextInput
                className="mt-2 max-w-md"
                placeholder="Other service: please specify"
                value={answer.serviceOther}
                onChange={(e) => set({ serviceOther: e.target.value })}
              />
            )}
          </Field>

          <Field eyebrow="Question 7" label={QUESTIONS.q7} hint="Select all that apply.">
            <ChipGroup options={STAKEHOLDERS} value={answer.stakeholders} onChange={(v) => set({ stakeholders: v })} />
          </Field>

          <Field eyebrow="Question 8" label={QUESTIONS.q8} hint="Select one.">
            <OptionList options={MATURITY} value={answer.maturity} onChange={(v) => set({ maturity: v })} columns={2} />
          </Field>

          <Field eyebrow="Question 9" label={QUESTIONS.q9} hint="Select one.">
            <OptionList options={OFFICE_TYPES} value={answer.officeType} onChange={(v) => set({ officeType: v })} />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field eyebrow="Question 10" label={QUESTIONS.q10} hint="Select one.">
              <ChipGroup options={IMPORTANCE} value={answer.importance} onChange={(v) => set({ importance: v })} multiple={false} />
            </Field>
            <Field eyebrow="Question 11" label={QUESTIONS.q11} hint="Select one.">
              <ChipGroup options={DECISION_LEVELS} value={answer.decisions} onChange={(v) => set({ decisions: v })} multiple={false} />
            </Field>
          </div>

          <Field eyebrow="Question 12" label="What is the MAIN gap?" hint={`Select up to ${MAX_GAPS}. For each gap you will be asked the main reason (Question 13).`}>
            <OptionList options={GAPS} value={answer.gaps} onChange={setGaps} multiple max={MAX_GAPS} columns={2} />
            {answer.gaps.includes(OTHER_SPECIFY) && (
              <TextInput
                className="mt-2 max-w-md"
                placeholder="Other gap: please specify"
                value={answer.gapOther}
                onChange={(e) => set({ gapOther: e.target.value })}
              />
            )}
            {gapsNeedingReason.length > 0 && (
              <div className="mt-4 space-y-4 border-l-2 border-cyan pl-4">
                {gapsNeedingReason.map((gap) => (
                  <div key={gap}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
                      Question 13 · Main reason for <span className="normal-case text-navy">{short(gap)}</span>
                    </p>
                    <div className="max-w-md">
                      <Select
                        options={REASONS}
                        placeholder="Select the main reason…"
                        value={(answer.reasons || {})[gap] || ''}
                        onChange={(v) => setReason(gap, v)}
                      />
                    </div>
                  </div>
                ))}
                {anyOtherReason && (
                  <TextInput
                    className="max-w-md"
                    placeholder="Other reason: please specify"
                    value={answer.reasonOther}
                    onChange={(e) => set({ reasonOther: e.target.value })}
                  />
                )}
              </div>
            )}
          </Field>

          <Field eyebrow="Question 14" label={QUESTIONS.q14}>
            <Textarea
              value={answer.action}
              onChange={(e) => set({ action: e.target.value })}
              placeholder="One concrete action, who should lead it and by when. Example: introduce our regional inspections lead to the client’s procurement head before Q2."
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist-100 pt-4">
            <p className={`text-sm ${left.length ? 'text-amber-700' : 'text-emerald-700'}`}>
              {left.length ? `Required, still missing: ${left.join(', ')}` : 'All questions answered.'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onToggle}>Collapse</Button>
              {hasNext && <Button onClick={onNext}>Next card →</Button>}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
