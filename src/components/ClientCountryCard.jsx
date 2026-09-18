import { useState } from 'react'
import { SERVICES, OFFICE_TYPES, DECISION_LEVELS, GAPS, REASONS, MAX_GAPS, MAX_REASONS, OTHER } from '../data/constants'
import { Field, ChipGroup, Scale, TagInput, Textarea, TextInput, Badge } from './ui'

export const ANSWER_FIELDS = ['services', 'stakeholders', 'maturity', 'officeType', 'importance', 'decisions', 'gaps', 'reasons', 'action']

export function completion(a) {
  if (!a) return 0
  return ANSWER_FIELDS.reduce((n, f) => {
    const v = a[f]
    const filled = Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null
    return n + (filled ? 1 : 0)
  }, 0)
}

export default function ClientCountryCard({ client, country, answer, onChange, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = completion(answer)
  const total = ANSWER_FIELDS.length
  const set = (patch) => onChange(patch)

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
        </span>
        <Badge tone={done === total ? 'ok' : done > 0 ? 'warn' : 'neutral'}>{done}/{total} answered</Badge>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-slate-100 px-5 py-5 md:grid-cols-2">
          <Field label="Q6 · Service provided to this country" hint="Select all that apply." className="md:col-span-2">
            <ChipGroup options={SERVICES} value={answer.services} onChange={(v) => set({ services: v })} />
            {answer.services.includes(OTHER) && (
              <TextInput
                className="mt-2 max-w-md"
                placeholder="Other service: please specify"
                value={answer.serviceOther}
                onChange={(e) => set({ serviceOther: e.target.value })}
              />
            )}
          </Field>

          <Field
            label="Q7 · Stakeholder groups actively known"
            hint="Type a group and press Enter (e.g. Procurement, Operations, Quality)."
            className="md:col-span-2"
          >
            <TagInput value={answer.stakeholders} onChange={(v) => set({ stakeholders: v })} placeholder="Add stakeholder group…" />
          </Field>

          <Field label="Q8 · Maturity of relationship">
            <Scale value={answer.maturity} onChange={(v) => set({ maturity: v })} lowLabel="1 · New / transactional" highLabel="5 · Strategic partner" />
          </Field>

          <Field label="Q9 · Office type">
            <ChipGroup options={OFFICE_TYPES} value={answer.officeType} onChange={(v) => set({ officeType: v })} multiple={false} />
          </Field>

          <Field label="Q10 · Strategic importance">
            <Scale value={answer.importance} onChange={(v) => set({ importance: v })} lowLabel="1 · Low" highLabel="5 · Critical" />
          </Field>

          <Field label="Q11 · Where are decisions made?">
            <ChipGroup options={DECISION_LEVELS} value={answer.decisions} onChange={(v) => set({ decisions: v })} multiple={false} />
          </Field>

          <Field label="Q12 · MAIN gap" hint={`Select up to ${MAX_GAPS}.`}>
            <ChipGroup options={GAPS} value={answer.gaps} onChange={(v) => set({ gaps: v })} max={MAX_GAPS} />
            {answer.gaps.includes(OTHER) && (
              <TextInput
                className="mt-2"
                placeholder="Other gap: please specify"
                value={answer.gapOther}
                onChange={(e) => set({ gapOther: e.target.value })}
              />
            )}
          </Field>

          <Field label="Q13 · MAIN reason for gap" hint={`Select up to ${MAX_REASONS}.`}>
            <ChipGroup options={REASONS} value={answer.reasons} onChange={(v) => set({ reasons: v })} max={MAX_REASONS} />
            {answer.reasons.includes(OTHER) && (
              <TextInput
                className="mt-2"
                placeholder="Other reason: please specify"
                value={answer.reasonOther}
                onChange={(e) => set({ reasonOther: e.target.value })}
              />
            )}
          </Field>

          <Field
            label="Q14 · Single most important action for PCU"
            hint="What should PCU do first to close the gap for this client in this country?"
            className="md:col-span-2"
          >
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
