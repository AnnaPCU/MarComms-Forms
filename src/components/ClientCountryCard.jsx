import { useState } from 'react'
import {
  SERVICES, SERVICE_OTHER, STAKEHOLDERS, MATURITY, OFFICE_TYPES, IMPORTANCE, DECISION_LEVELS,
  GAPS, MAX_GAPS, REASONS, OTHER_SPECIFY, QUESTIONS,
} from '../data/constants'
import { Field, ChipGroup, Textarea, TextInput, Badge } from './ui'

export const ANSWER_FIELDS = ['services', 'stakeholders', 'maturity', 'officeType', 'importance', 'decisions', 'gaps', 'reasons', 'action']

export function completion(a) {
  if (!a) return 0
  return ANSWER_FIELDS.reduce((n, f) => {
    const v = a[f]
    let filled
    if (f === 'reasons') filled = (a.gaps || []).length > 0 && a.gaps.every((g) => (v || {})[g])
    else if (Array.isArray(v)) filled = v.length > 0
    else if (typeof v === 'string') filled = v.trim() !== ''
    else filled = v != null
    return n + (filled ? 1 : 0)
  }, 0)
}

const short = (s) => s.replace(/\s*\(.*\)\s*$/, '')

export default function ClientCountryCard({ client, region, country, answer, onChange, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = completion(answer)
  const total = ANSWER_FIELDS.length
  const set = (patch) => onChange(patch)

  const setGaps = (gaps) => {
    // Drop reasons for gaps that were unselected.
    const reasons = Object.fromEntries(Object.entries(answer.reasons || {}).filter(([g]) => gaps.includes(g)))
    set({ gaps, reasons })
  }
  const setReason = (gap, reason) => set({ reasons: { ...(answer.reasons || {}), [gap]: reason } })

  const anyOtherReason = Object.values(answer.reasons || {}).some((r) => r === OTHER_SPECIFY)

  return (
    <article className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
      >
        <span className={`text-mist transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>▶</span>
        <span className="min-w-0 flex-1">
          <span className="font-bold text-navy">{client}</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-medium text-slate-700">{country}</span>
          {region && <span className="ml-2 text-xs text-mist">{region}</span>}
        </span>
        <Badge tone={done === total ? 'ok' : done > 0 ? 'warn' : 'neutral'}>{done}/{total} answered</Badge>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-slate-100 px-5 py-5 md:grid-cols-2">
          <Field label={`Q6 · ${QUESTIONS.q6}`} hint="Select all that apply." className="md:col-span-2">
            <ChipGroup options={SERVICES} value={answer.services} onChange={(v) => set({ services: v })} />
            {answer.services.includes(SERVICE_OTHER) && (
              <TextInput
                className="mt-2 max-w-md"
                placeholder="Other service: please specify"
                value={answer.serviceOther}
                onChange={(e) => set({ serviceOther: e.target.value })}
              />
            )}
          </Field>

          <Field label={`Q7 · ${QUESTIONS.q7}`} hint="Select all that apply." className="md:col-span-2">
            <ChipGroup options={STAKEHOLDERS} value={answer.stakeholders} onChange={(v) => set({ stakeholders: v })} />
          </Field>

          <Field label={`Q8 · ${QUESTIONS.q8}`}>
            <ChipGroup options={MATURITY} value={answer.maturity} onChange={(v) => set({ maturity: v })} multiple={false} />
          </Field>

          <Field label={`Q9 · ${QUESTIONS.q9}`}>
            <ChipGroup options={OFFICE_TYPES} value={answer.officeType} onChange={(v) => set({ officeType: v })} multiple={false} />
          </Field>

          <Field label={`Q10 · ${QUESTIONS.q10}`}>
            <ChipGroup options={IMPORTANCE} value={answer.importance} onChange={(v) => set({ importance: v })} multiple={false} />
          </Field>

          <Field label={`Q11 · ${QUESTIONS.q11}`}>
            <ChipGroup options={DECISION_LEVELS} value={answer.decisions} onChange={(v) => set({ decisions: v })} multiple={false} />
          </Field>

          <Field label={`Q12 · ${QUESTIONS.q12}`} className="md:col-span-2">
            <ChipGroup options={GAPS} value={answer.gaps} onChange={setGaps} max={MAX_GAPS} />
            {answer.gaps.includes(OTHER_SPECIFY) && (
              <TextInput
                className="mt-2 max-w-md"
                placeholder="Other gap: please specify"
                value={answer.gapOther}
                onChange={(e) => set({ gapOther: e.target.value })}
              />
            )}
          </Field>

          <Field
            label={`Q13 · ${QUESTIONS.q13}`}
            hint={answer.gaps.length ? 'Pick one reason for each gap selected above.' : 'Select a gap in Q12 first.'}
            className="md:col-span-2"
          >
            <div className="space-y-4">
              {answer.gaps.map((gap) => (
                <div key={gap} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist">Reason for: <span className="text-navy normal-case">{short(gap)}</span></p>
                  <ChipGroup options={REASONS} value={(answer.reasons || {})[gap] || ''} onChange={(v) => setReason(gap, v)} multiple={false} />
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
          </Field>

          <Field label={`Q14 · ${QUESTIONS.q14}`} className="md:col-span-2">
            <Textarea
              value={answer.action}
              onChange={(e) => set({ action: e.target.value })}
              placeholder="Describe the one action with the highest impact…"
            />
          </Field>
        </div>
      )}
    </article>
  )
}
