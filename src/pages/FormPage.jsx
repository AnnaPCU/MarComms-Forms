import { useEffect, useMemo, useState } from 'react'
import { COUNTRIES, CLIENT_SUGGESTIONS } from '../data/constants'
import { pairKey, splitKey, emptyAnswer, listPairs, exportXlsx, exportCsv, toDbRows } from '../utils/export'
import { supabase, isConfigured, TABLE } from '../lib/supabase'
import { Section, Field, TextInput, Select, TagInput, ChipGroup, Button, Badge } from '../components/ui'
import ClientCountryCard, { completion, ANSWER_FIELDS } from '../components/ClientCountryCard'

const STORAGE_KEY = 'pcu-client-country-matrix-v1'

const initialForm = () => ({
  respondentName: '',
  respondentCountry: '',
  clients: [],
  clientCountries: {},
  answers: {},
})

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialForm(), ...JSON.parse(raw) } : initialForm()
  } catch {
    return initialForm()
  }
}

export default function FormPage() {
  const [form, setForm] = useState(loadDraft)
  const [submit, setSubmit] = useState({ status: 'idle', message: '' })

  // Autosave draft so a respondent can close the tab and resume later.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch {
      /* storage unavailable: work in memory only */
    }
  }, [form])

  const pairs = useMemo(() => listPairs(form), [form])
  const answeredCount = pairs.filter((p) => completion(form.answers[p.key]) === ANSWER_FIELDS.length).length

  // ---------- state updates ----------
  const patch = (p) => {
    setForm((f) => ({ ...f, ...p }))
    if (submit.status === 'success') setSubmit({ status: 'idle', message: '' })
  }

  const setClients = (next) =>
    setForm((f) => {
      const clientCountries = {}
      next.forEach((c) => {
        clientCountries[c] = f.clientCountries[c] || []
      })
      const answers = {}
      Object.entries(f.answers).forEach(([k, v]) => {
        if (next.includes(splitKey(k)[0])) answers[k] = v
      })
      return { ...f, clients: next, clientCountries, answers }
    })

  const setClientCountries = (client, picked) =>
    setForm((f) => {
      // Keep master-list order so cards and export rows are stable regardless of click order.
      const countries = COUNTRIES.filter((c) => picked.includes(c))
      const answers = { ...f.answers }
      Object.keys(answers).forEach((k) => {
        const [c, co] = splitKey(k)
        if (c === client && !countries.includes(co)) delete answers[k]
      })
      countries.forEach((co) => {
        const k = pairKey(client, co)
        if (!answers[k]) answers[k] = emptyAnswer()
      })
      return { ...f, clientCountries: { ...f.clientCountries, [client]: countries }, answers }
    })

  const updateAnswer = (key, p) =>
    setForm((f) => ({ ...f, answers: { ...f.answers, [key]: { ...(f.answers[key] || emptyAnswer()), ...p } } }))

  const resetForm = () => {
    if (!window.confirm('Clear all answers and start over?')) return
    setForm(initialForm())
    setSubmit({ status: 'idle', message: '' })
  }

  // ---------- validation ----------
  const issues = useMemo(() => {
    const list = []
    if (!form.respondentName.trim()) list.push('Respondent name is required.')
    if (!form.respondentCountry) list.push('Respondent country is required.')
    if (!form.clients.length) list.push('Add at least one client.')
    form.clients.forEach((c) => {
      if (!(form.clientCountries[c] || []).length) list.push(`Select at least one country for "${c}".`)
    })
    return list
  }, [form])

  const canExport = pairs.length > 0
  const canSend = isConfigured && issues.length === 0

  // ---------- submit to Supabase ----------
  async function sendForm() {
    if (!canSend) return
    setSubmit({ status: 'sending', message: 'Sending…' })
    try {
      const submissionId = crypto.randomUUID()
      const submittedAt = new Date().toISOString()
      const rows = toDbRows(form, submissionId, submittedAt)
      const { error } = await supabase.from(TABLE).insert(rows)
      if (error) throw new Error(error.message)
      setSubmit({
        status: 'success',
        message: `Thank you. ${rows.length} Client × Country row${rows.length === 1 ? '' : 's'} saved at ${new Date().toLocaleTimeString()}. Reference ${submissionId.slice(0, 8)}.`,
      })
    } catch (err) {
      setSubmit({
        status: 'error',
        message: `Submission failed: ${err.message}. Your answers are still saved in this browser. Try again or use "Export to Excel" and send the file by email.`,
      })
    }
  }

  const step2Locked = form.clients.length === 0
  const step3Locked = pairs.length === 0

  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">PCU · Commercial intelligence</p>
          <h1 className="text-2xl font-bold">Client × Country Matrix</h1>
          <p className="max-w-2xl text-sm text-white/75">
            Map every client you work with to the countries where you serve them, then answer nine questions per
            combination. Your answers are saved in this browser until you submit them.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* 1 · General */}
          <Section number={1} title="Respondent" description="Who is completing this form.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Respondent name" required>
                <TextInput
                  value={form.respondentName}
                  onChange={(e) => patch({ respondentName: e.target.value })}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </Field>
              <Field label="Respondent country" required>
                <Select
                  options={COUNTRIES}
                  value={form.respondentCountry}
                  onChange={(v) => patch({ respondentCountry: v })}
                  placeholder="Select your country…"
                />
              </Field>
              <Field label="Clients" required hint="Type a client name and press Enter. Add as many as you need." className="md:col-span-2">
                <TagInput id="clients" value={form.clients} onChange={setClients} placeholder="Client name…" suggestions={CLIENT_SUGGESTIONS} />
              </Field>
            </div>
          </Section>

          {/* 2 · Countries per client */}
          <Section
            number={2}
            title="Countries per client"
            description="For each client, select every country where you provide services."
            locked={step2Locked}
            lockedHint="Add at least one client in step 1 to continue."
          >
            <div className="space-y-6">
              {form.clients.map((client) => {
                const sel = form.clientCountries[client] || []
                return (
                  <div key={client} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-navy">{client}</h3>
                      <Badge tone={sel.length ? 'navy' : 'warn'}>
                        {sel.length ? `${sel.length} countr${sel.length === 1 ? 'y' : 'ies'}` : 'No country yet'}
                      </Badge>
                    </div>
                    <ChipGroup options={COUNTRIES} value={sel} onChange={(v) => setClientCountries(client, v)} searchable />
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 3 · Matrix */}
          <Section
            number={3}
            title="Client × Country details"
            description="One card per combination. Expand a card to answer Q6 to Q14."
            locked={step3Locked}
            lockedHint="Select countries for your clients in step 2 to generate the cards."
          >
            <div className="space-y-6">
              {form.clients.map((client) => {
                const countries = form.clientCountries[client] || []
                if (!countries.length) return null
                return (
                  <div key={client}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist">{client}</h3>
                    <div className="space-y-2">
                      {countries.map((country) => {
                        const key = pairKey(client, country)
                        return (
                          <ClientCountryCard
                            key={key}
                            client={client}
                            country={country}
                            answer={form.answers[key] || emptyAnswer()}
                            onChange={(p) => updateAnswer(key, p)}
                            defaultOpen={pairs.length === 1}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 4 · Submit */}
          <Section number={4} title="Submit" description="Send your answers. You can also keep a copy for yourself.">
            <div className="space-y-5">
              {!isConfigured && (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Online submission is not configured yet (missing Supabase environment variables). Use the export
                  buttons below and send the file by email.
                </p>
              )}

              {issues.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {issues.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={sendForm} disabled={!canSend || submit.status === 'sending'}>
                  {submit.status === 'sending' ? 'Sending…' : submit.status === 'success' ? 'Submit again' : 'Submit form'}
                </Button>
                <Button variant="ghost" onClick={resetForm}>Reset form</Button>
              </div>

              {submit.status === 'success' && (
                <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ {submit.message}</p>
              )}
              {submit.status === 'error' && (
                <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{submit.message}</p>
              )}

              <div className="border-t border-slate-100 pt-5">
                <p className="mb-2 text-sm font-semibold text-slate-800">Keep a copy</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => exportXlsx(form)} disabled={!canExport}>
                    Export to Excel (.xlsx)
                  </Button>
                  <Button variant="secondary" onClick={() => exportCsv(form)} disabled={!canExport}>
                    Export as .csv
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-mist">One row per Client × Country combination, with all answers as columns.</p>
              </div>
            </div>
          </Section>
        </div>

        {/* Sticky summary */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-mist">Progress</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Clients</dt>
                <dd className="font-bold text-navy">{form.clients.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Client × Country</dt>
                <dd className="font-bold text-navy">{pairs.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Fully answered</dt>
                <dd className="font-bold text-navy">
                  {answeredCount}/{pairs.length}
                </dd>
              </div>
            </dl>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-navy transition-all"
                style={{ width: pairs.length ? `${Math.round((answeredCount / pairs.length) * 100)}%` : '0%' }}
              />
            </div>
            {pairs.length > 0 && (
              <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto text-xs">
                {pairs.map((p) => {
                  const done = completion(form.answers[p.key])
                  return (
                    <li key={p.key} className="flex items-center justify-between gap-2 text-slate-600">
                      <span className="truncate">
                        <span className="font-medium text-slate-800">{p.client}</span> / {p.country}
                      </span>
                      <span className={done === ANSWER_FIELDS.length ? 'text-emerald-600' : 'text-mist'}>
                        {done}/{ANSWER_FIELDS.length}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-8 text-right">
        <a href="#/admin" className="text-xs text-mist hover:text-navy">Admin</a>
      </footer>
    </div>
  )
}
