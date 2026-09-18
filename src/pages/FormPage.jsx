import { useEffect, useMemo, useRef, useState } from 'react'
import { CLIENTS, REGIONS, COUNTRIES_BY_REGION, COUNTRY_REGION, ALL_COUNTRIES, RESPONDENT_COUNTRIES, QUESTIONS } from '../data/constants'
import { pairKey, splitKey, emptyAnswer, listPairs, toDbRows } from '../utils/export'
import { supabase, isConfigured, TABLE } from '../lib/supabase'
import { Section, Field, TextInput, Select, ChipGroup, Button, Badge, Notice, CheckIcon } from '../components/ui'
import ClientCountryCard, { completion, missing, ANSWER_FIELDS, cardId } from '../components/ClientCountryCard'
import ProgressBar from '../components/ProgressBar'
import { ClientLogo, ClientBanner } from '../components/ClientMark'
import { BrandHeader, BrandFooter } from '../components/Brand'

const STORAGE_KEY = 'pcu-abccd-survey-v2'
const WIDTH = 'max-w-4xl'

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
  const [attempted, setAttempted] = useState(false)
  const issuesRef = useRef(null)

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

  // Which card is expanded. Defaults to the first card with unanswered questions.
  const [openKey, setOpenKey] = useState(null)
  useEffect(() => {
    if (openKey && pairs.some((p) => p.key === openKey)) return
    const first = pairs.find((p) => completion(form.answers[p.key]) < ANSWER_FIELDS.length) || null
    setOpenKey(first ? first.key : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.map((p) => p.key).join('|')])

  const openNext = (key) => {
    const i = pairs.findIndex((p) => p.key === key)
    const next = pairs[i + 1]
    if (!next) return
    setOpenKey(next.key)
    requestAnimationFrame(() => document.getElementById(cardId(next.key))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  // Overall progress: 20% for steps 1-2, 80% for the questions inside the cards.
  const answeredQuestions = pairs.reduce((n, p) => n + completion(form.answers[p.key]), 0)
  const totalQuestions = pairs.length * ANSWER_FIELDS.length

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
      const home = f.respondentCountry
      clients.forEach((c) => {
        const isNew = !f.clients.includes(c)
        clientRegions[c] = f.clientRegions[c] || (isNew && home ? [COUNTRY_REGION[home]] : [])
        clientCountries[c] = f.clientCountries[c] || (isNew && home ? [home] : [])
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
    setAttempted(false)
  }

  // ---------- validation ----------
  // Every field is required: steps 1 and 2, plus all nine questions in every card
  // (Q13 only for gaps that need a reason; "Other" text only when "Other" is selected).
  const issues = useMemo(() => {
    const list = []
    if (!form.respondentName.trim()) list.push({ text: 'Respondent name is required.' })
    if (!form.respondentCountry) list.push({ text: 'Respondent country is required.' })
    if (!form.clients.length) list.push({ text: 'Select at least one client.' })
    form.clients.forEach((c) => {
      if (!(form.clientRegions[c] || []).length) list.push({ text: `Select at least one region for ${c}.` })
      else if (!(form.clientCountries[c] || []).length) list.push({ text: `Select at least one country for ${c}.` })
    })
    pairs.forEach((p) => {
      const left = missing(form.answers[p.key])
      if (left.length) list.push({ text: `${p.client} / ${p.country}: answer ${left.join(', ')}`, cardKey: p.key })
    })
    return list
  }, [form, pairs])

  const goToCard = (key) => {
    setOpenKey(key)
    requestAnimationFrame(() => document.getElementById(cardId(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }


  // ---------- submit to Supabase ----------
  async function sendForm() {
    if (!isConfigured) return
    if (issues.length) {
      setAttempted(true)
      requestAnimationFrame(() => issuesRef.current?.focus())
      return
    }
    setSubmit({ status: 'sending', message: 'Sending…' })
    try {
      const submissionId = crypto.randomUUID()
      const submittedAt = new Date().toISOString()
      const rows = toDbRows(form, submissionId, submittedAt)
      const { error } = await supabase.from(TABLE).insert(rows)
      if (error) throw new Error(error.message)
      requestAnimationFrame(() => document.getElementById('section-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      setSubmit({
        status: 'success',
        message: `${rows.length} Client × Country row${rows.length === 1 ? '' : 's'} saved at ${new Date().toLocaleTimeString()}. Reference ${submissionId.slice(0, 8)}.`,
      })
    } catch (err) {
      setSubmit({
        status: 'error',
        message: `Submission failed: ${err.message}. Your answers are still saved in this browser. Please try again in a moment or contact the MarComms team.`,
      })
    }
  }

  const step2Locked = form.clients.length === 0
  const step3Locked = pairs.length === 0
  const step1Done = Boolean(form.respondentName.trim() && form.respondentCountry && form.clients.length)
  const step2Done = !step2Locked && form.clients.every((c) => (form.clientCountries[c] || []).length > 0)
  const step3Done = pairs.length > 0 && answeredCount === pairs.length
  const pending = pairs.length - answeredCount
  const setupScore = [form.respondentName.trim(), form.respondentCountry, form.clients.length, step2Done].filter(Boolean).length / 4
  const percent = Math.round(20 * setupScore + (totalQuestions ? 80 * (answeredQuestions / totalQuestions) : 0))

  return (
    <div className="min-h-screen">
      <BrandHeader
        width={WIDTH}
        title="ABCCD Inspections Survey · Client relationship map"
        subtitle="For leaders and service owners of Inspections. Tell us where you serve ADM, Bunge, Cargill, COFCO and LDC, how mature each relationship is, where the main gaps are and what PCU should do next. One short card per client and country."
      />
      <ProgressBar
        width={WIDTH}
        percent={submit.status === 'success' ? 100 : percent}
        label={
          submit.status === 'success'
            ? 'Submitted'
            : pairs.length
              ? `${answeredCount}/${pairs.length} cards complete · ${answeredQuestions}/${totalQuestions} questions`
              : 'Start with your details and clients'
        }
      />

      <main className={`mx-auto ${WIDTH} px-4 py-6 sm:px-6 sm:py-10`}>
        <div className="space-y-8">
          {/* 1 · Respondent + clients */}
          <Section number={1} title="Respondent and clients" description="Who is completing this form and which clients they work with." done={step1Done}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={QUESTIONS.respondentName} required error={attempted && !form.respondentName.trim() ? 'Required' : undefined}>
                <TextInput
                  value={form.respondentName}
                  onChange={(e) => patch({ respondentName: e.target.value })}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </Field>
              <Field label={QUESTIONS.respondentCountry} required error={attempted && !form.respondentCountry ? 'Required' : undefined}>
                <Select
                  options={RESPONDENT_COUNTRIES}
                  value={form.respondentCountry}
                  onChange={(v) => patch({ respondentCountry: v })}
                  placeholder="Select your country…"
                />
              </Field>
              <Field label={QUESTIONS.client} required hint="Select all that apply." className="md:col-span-2" error={attempted && !form.clients.length ? 'Select at least one client' : undefined}>
                <ChipGroup
                  options={CLIENTS}
                  value={form.clients}
                  onChange={setClients}
                  renderLabel={(c) => (
                    <span className="inline-flex items-center gap-2 py-0.5">
                      <ClientLogo client={c} size="sm" />
                      <span>{c}</span>
                    </span>
                  )}
                />
              </Field>
            </div>
          </Section>

          {/* 2 · Regions and countries per client */}
          <Section
            number={2}
            title="Regions and countries per client"
            description="For each client: which regions you work with, then the countries within each region."
            locked={step2Locked}
            done={step2Done}
            lockedHint="Select at least one client in step 1 to continue."
          >
            <div className="space-y-6">
              {form.clients.map((client) => {
                const regions = form.clientRegions[client] || []
                const countries = form.clientCountries[client] || []
                return (
                  <div key={client} className="rounded-xl border border-mist-200 bg-paper/60 p-4 sm:p-5">
                    <h3 className="mb-4 border-b border-mist-200 pb-4">
                      <ClientBanner
                        client={client}
                        subtitle="Where do you work with this client?"
                        right={
                          <Badge tone={countries.length ? 'navy' : 'neutral'}>
                            {countries.length ? `${countries.length} countr${countries.length === 1 ? 'y' : 'ies'}` : 'No country yet'}
                          </Badge>
                        }
                      />
                    </h3>
                    <Field
                      label={QUESTIONS.region}
                      hint={
                        countries.length === 1 && countries[0] === form.respondentCountry
                          ? `Pre-filled with your own country (${form.respondentCountry}). Add any other region or country where you serve ${client}.`
                          : 'Select all that apply.'
                      }
                    >
                      <ChipGroup options={REGIONS} value={regions} onChange={(v) => setClientRegions(client, v)} />
                    </Field>
                    {regions.map((region) => {
                      const sel = countries.filter((c) => COUNTRY_REGION[c] === region)
                      return (
                        <div key={region} className="mt-5 border-t border-mist-200 pt-5">
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
            done={step3Done}
            lockedHint="Select regions and countries for your clients in step 2 to generate the cards."
          >
            <div className="space-y-6">
              {form.clients.map((client) => {
                const countries = form.clientCountries[client] || []
                if (!countries.length) return null
                return (
                  <div key={client} className="rounded-2xl border border-mist-200 bg-paper/60 p-3 sm:p-4">
                    <h3 className="mb-4 border-l-4 border-cyan pl-4">
                      <ClientBanner
                        client={client}
                        subtitle={`${countries.length} countr${countries.length === 1 ? 'y' : 'ies'} · answer one card per country`}
                      />
                    </h3>
                    <div className="space-y-3">
                      {countries.map((country) => {
                        const key = pairKey(client, country)
                        return (
                          <ClientCountryCard
                            key={key}
                            id={cardId(key)}
                            client={client}
                            region={COUNTRY_REGION[country]}
                            country={country}
                            answer={form.answers[key] || emptyAnswer()}
                            onChange={(p) => updateAnswer(key, p)}
                            open={openKey === key}
                            onToggle={() => setOpenKey((k) => (k === key ? null : key))}
                            onNext={() => openNext(key)}
                            hasNext={pairs.findIndex((p) => p.key === key) < pairs.length - 1}
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
          <Section id="section-4" number={4} title="Submit" description="Send your answers to the MarComms team." done={submit.status === 'success'}>
            {submit.status === 'success' ? (
              <Notice tone="success" role="status" className="px-5 py-5">
                <p className="inline-flex items-center gap-2 text-lg font-bold">
                  <CheckIcon className="h-5 w-5 text-cyan-600" />
                  Thank you, your answers were sent.
                </p>
                <p className="mt-1 text-sm">{submit.message}</p>
                <p className="mt-3 text-sm">
                  You can close this page. If you need to correct something, edit your answers and submit again; the
                  MarComms team keeps the latest version.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setSubmit({ status: 'idle', message: '' })}>Edit my answers</Button>
                  <Button variant="ghost" onClick={resetForm}>Start a new response</Button>
                </div>
              </Notice>
            ) : (
              <div className="space-y-5">
                {!isConfigured && (
                  <Notice tone="info" title="Not available">
                    Online submission is not configured yet. Please contact the MarComms team.
                  </Notice>
                )}

                {attempted && issues.length > 0 ? (
                  <Notice tone="error" title="Before you submit" ref={issuesRef} tabIndex={-1} role="alert" className="outline-none">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {issues.map((i) =>
                        i.cardKey ? (
                          <li key={i.text}>
                            <button type="button" className="text-left font-medium underline underline-offset-2 hover:text-navy" onClick={() => goToCard(i.cardKey)}>
                              {i.text}
                            </button>
                          </li>
                        ) : (
                          <li key={i.text}>{i.text}</li>
                        ),
                      )}
                    </ul>
                  </Notice>
                ) : (
                  <p className="text-sm text-ink">
                    {issues.length
                      ? pending > 0
                        ? `All questions are required. ${pending} card${pending === 1 ? ' still has' : 's still have'} unanswered questions.`
                        : 'All questions are required. Complete steps 1 and 2, then answer every card in step 3.'
                      : 'Everything is complete. You can submit your answers.'}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg" onClick={sendForm} disabled={!isConfigured || submit.status === 'sending'} className="min-w-[200px]">
                    {submit.status === 'sending' ? 'Sending…' : 'Submit answers'}
                  </Button>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={resetForm}>Reset form</Button>
                </div>

                {submit.status === 'error' && (
                  <Notice tone="error" title="Not sent" role="alert">{submit.message}</Notice>
                )}
              </div>
            )}
          </Section>
        </div>

      </main>

      <BrandFooter width={WIDTH} links={[{ href: '#/admin', label: 'Admin' }]} />
    </div>
  )
}
