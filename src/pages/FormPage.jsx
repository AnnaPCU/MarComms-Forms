import { useEffect, useMemo, useState } from 'react'
import { CLIENTS, REGIONS, COUNTRIES_BY_REGION, COUNTRY_REGION, ALL_COUNTRIES, RESPONDENT_COUNTRIES, QUESTIONS } from '../data/constants'
import { pairKey, splitKey, emptyAnswer, listPairs, exportXlsx, exportCsv, toDbRows } from '../utils/export'
import { supabase, isConfigured, TABLE } from '../lib/supabase'
import { Section, Field, TextInput, Select, ChipGroup, Button, Badge } from '../components/ui'
import ClientCountryCard, { completion, ANSWER_FIELDS } from '../components/ClientCountryCard'
import { BrandHeader, BrandFooter } from '../components/Brand'

const STORAGE_KEY = 'pcu-abccd-survey-v2'

const initialForm = () => ({
  respondentName: '',
  respondentCountry: '',
  clients: [],
  clientRegions: {}, // { [client]: [region] }
  clientCountries: {}, // { [client]: [country] }
  answers: {}, // { [client|||country]: answer }
})

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialForm(), ...JSON.parse(raw) } : initialForm()
  } catch {
    return initialForm()
  }
}

const sortCountries = (list) => ALL_COUNTRIES.filter((c) => list.includes(c))

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

  /** Recompute answers so only current client×country pairs remain, seeding new ones. */
  const syncAnswers = (f) => {
    const answers = {}
    f.clients.forEach((client) => {
      ;(f.clientCountries[client] || []).forEach((country) => {
        const k = pairKey(client, country)
        answers[k] = f.answers[k] || emptyAnswer()
      })
    })
    return { ...f, answers }
  }

  const setClients = (picked) =>
    setForm((f) => {
      const clients = CLIENTS.filter((c) => picked.includes(c))
      const clientRegions = {}
      const clientCountries = {}
      clients.forEach((c) => {
        clientRegions[c] = f.clientRegions[c] || []
        clientCountries[c] = f.clientCountries[c] || []
      })
      return syncAnswers({ ...f, clients, clientRegions, clientCountries })
    })

  const setClientRegions = (client, picked) =>
    setForm((f) => {
      const regions = REGIONS.filter((r) => picked.includes(r))
      // Drop countries whose region was unselected.
      const countries = (f.clientCountries[client] || []).filter((c) => regions.includes(COUNTRY_REGION[c]))
      return syncAnswers({
        ...f,
        clientRegions: { ...f.clientRegions, [client]: regions },
        clientCountries: { ...f.clientCountries, [client]: countries },
      })
    })

  const setRegionCountries = (client, region, picked) =>
    setForm((f) => {
      const others = (f.clientCountries[client] || []).filter((c) => COUNTRY_REGION[c] !== region)
      const countries = sortCountries([...others, ...picked])
      return syncAnswers({ ...f, clientCountries: { ...f.clientCountries, [client]: countries } })
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
    if (!form.clients.length) list.push('Select at least one client.')
    form.clients.forEach((c) => {
      if (!(form.clientRegions[c] || []).length) list.push(`Select at least one region for ${c}.`)
      else if (!(form.clientCountries[c] || []).length) list.push(`Select at least one country for ${c}.`)
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
      <BrandHeader
        title="ABCCD Survey · Client × Country"
        subtitle="Tell us which clients you work with, in which regions and countries, and answer nine questions per Client × Country. Your answers are saved in this browser until you submit them."
      />

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* 1 · Respondent + clients */}
          <Section number={1} title="Respondent and clients" description="Who is completing this form and which clients they work with.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={QUESTIONS.respondentName} required>
                <TextInput
                  value={form.respondentName}
                  onChange={(e) => patch({ respondentName: e.target.value })}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </Field>
              <Field label={QUESTIONS.respondentCountry} required>
                <Select
                  options={RESPONDENT_COUNTRIES}
                  value={form.respondentCountry}
                  onChange={(v) => patch({ respondentCountry: v })}
                  placeholder="Select your country…"
                />
              </Field>
              <Field label={QUESTIONS.client} required hint="Select all that apply." className="md:col-span-2">
                <ChipGroup options={CLIENTS} value={form.clients} onChange={setClients} />
              </Field>
            </div>
          </Section>

          {/* 2 · Regions and countries per client */}
          <Section
            number={2}
            title="Regions and countries per client"
            description="For each client: which regions you work with, then the countries within each region."
            locked={step2Locked}
            lockedHint="Select at least one client in step 1 to continue."
          >
            <div className="space-y-6">
              {form.clients.map((client) => {
                const regions = form.clientRegions[client] || []
                const countries = form.clientCountries[client] || []
                return (
                  <div key={client} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-navy">{client}</h3>
                      <Badge tone={countries.length ? 'navy' : 'warn'}>
                        {countries.length ? `${countries.length} countr${countries.length === 1 ? 'y' : 'ies'}` : 'No country yet'}
                      </Badge>
                    </div>
                    <Field label={QUESTIONS.region} hint="Select all that apply.">
                      <ChipGroup options={REGIONS} value={regions} onChange={(v) => setClientRegions(client, v)} />
                    </Field>
                    {regions.map((region) => {
                      const sel = countries.filter((c) => COUNTRY_REGION[c] === region)
                      return (
                        <div key={region} className="mt-4 border-t border-slate-100 pt-4">
                          <Field label={`${QUESTIONS.country} · ${region}`}>
                            <ChipGroup
                              options={COUNTRIES_BY_REGION[region]}
                              value={sel}
                              onChange={(v) => setRegionCountries(client, region, v)}
                              searchable={COUNTRIES_BY_REGION[region].length > 12}
                            />
                          </Field>
                        </div>
                      )
                    })}
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
            lockedHint="Select regions and countries for your clients in step 2 to generate the cards."
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
                            region={COUNTRY_REGION[country]}
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
                <p className="mt-1.5 text-xs text-mist">Same layout as the survey template: one row per Client × Country.</p>
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
                className="h-full rounded-full bg-cyan transition-all"
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

      <BrandFooter links={[{ href: '#/admin', label: 'Admin' }]} />
    </div>
  )
}
