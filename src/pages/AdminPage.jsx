import { useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured, TABLE } from '../lib/supabase'
import { dbToRecord, toRow, writeXlsx, writeCsv, stamp, safe } from '../utils/export'
import { Button, Field, TextInput, Badge, Section, Notice } from '../components/ui'
import { BrandHeader, BrandFooter } from '../components/Brand'
import { ClientLogo } from '../components/ClientMark'

const PAGE = 1000 // Supabase returns at most 1000 rows per request

async function fetchAllRows() {
  const all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('submitted_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all.map(dbToRecord)
}

function groupSubmissions(records) {
  const map = new Map()
  records.forEach((r) => {
    const g = map.get(r.submissionId) || {
      submissionId: r.submissionId,
      submittedAt: r.submittedAt,
      respondentName: r.respondentName,
      respondentCountry: r.respondentCountry,
      clients: new Set(),
      rows: 0,
    }
    g.clients.add(r.client)
    g.rows += 1
    map.set(r.submissionId, g)
  })
  return [...map.values()].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '')

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isConfigured) {
      setAuthReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      setRecords(await fetchAllRows())
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) load()
  }, [session])

  async function signIn(e) {
    e.preventDefault()
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setPassword('')
  }

  const submissions = useMemo(() => groupSubmissions(records), [records])
  const respondents = useMemo(() => new Set(records.map((r) => r.respondentName.trim().toLowerCase())).size, [records])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter(
      (s) =>
        s.respondentName.toLowerCase().includes(q) ||
        s.respondentCountry.toLowerCase().includes(q) ||
        [...s.clients].some((c) => c.toLowerCase().includes(q)),
    )
  }, [submissions, query])

  const summaryRows = (subs) =>
    subs.map((s) => ({
      'Submitted at': s.submittedAt,
      'Respondent Name': s.respondentName,
      'Respondent Country': s.respondentCountry,
      Clients: [...s.clients].join('; '),
      'Client × Country rows': s.rows,
      'Submission ID': s.submissionId,
    }))

  const downloadAll = () => {
    writeXlsx(
      [
        { name: 'Survey', rows: records.map(toRow) },
        { name: 'Submissions', rows: summaryRows(submissions) },
      ],
      `ABCCD_Survey_ALL_${stamp()}.xlsx`,
    )
  }
  const downloadAllCsv = () => writeCsv(records.map(toRow), `ABCCD_Survey_ALL_${stamp()}.csv`)
  const downloadOne = (s) => {
    const rows = records.filter((r) => r.submissionId === s.submissionId).map(toRow)
    writeXlsx([{ name: 'Survey', rows }], `ABCCD_Survey_${safe(s.respondentName)}_${s.submittedAt.slice(0, 10)}.xlsx`)
  }

  // ---------- render ----------
  const shell = (children) => (
    <div className="flex min-h-screen flex-col">
      <BrandHeader
        title="ABCCD Survey · Admin"
        eyebrow="Inspections · Commercial intelligence · Admin"
        subtitle="Consolidated view of every submission. Download the full Excel or a single respondent's file."
        right={
          session && (
            <Button variant="onDark" size="sm" onClick={() => supabase.auth.signOut()}>
              Sign out
            </Button>
          )
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      <BrandFooter links={[{ href: '#/', label: 'Back to form' }]} />
    </div>
  )

  if (!isConfigured) {
    return shell(
      <Notice tone="info" title="Not configured">
        Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see SETUP.md).
      </Notice>,
    )
  }

  if (!authReady) return shell(<p className="text-sm text-mist">Loading…</p>)

  if (!session) {
    return shell(
      <form onSubmit={signIn} className="mx-auto max-w-sm rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-navy">Sign in</h2>
        <div className="space-y-4">
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          {authError && <p className="text-sm text-rose-600">{authError}</p>}
          <Button type="submit" className="w-full">Sign in</Button>
        </div>
      </form>,
    )
  }

  return shell(
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Submissions', submissions.length],
          ['Respondents', respondents],
          ['Client × Country rows', records.length],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-mist-200 border-t-4 border-t-cyan bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-navy">{loading ? '…' : n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-mist-200 bg-white p-4 shadow-sm">
        <Button onClick={downloadAll} disabled={!records.length}>Download consolidated Excel</Button>
        <Button variant="ghost" onClick={downloadAllCsv} disabled={!records.length}>.csv</Button>
        <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
        <div className="ml-auto w-full sm:max-w-xs">
          <TextInput placeholder="Filter by respondent, country or client…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {loadError && <Notice tone="error" title="Could not load responses">{loadError}</Notice>}

      <Section title="Submissions" description={`${visible.length} of ${submissions.length} shown`}>
      <div className="-mx-4 overflow-x-auto sm:-mx-6">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs font-semibold uppercase tracking-wider text-mist">
            <tr>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Respondent</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Clients</th>
              <th className="px-4 py-3 text-right">Rows</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">
            {visible.map((s) => (
              <tr key={s.submissionId} className="hover:bg-paper">
                <td className="whitespace-nowrap px-4 py-3 text-ink">{fmtDate(s.submittedAt)}</td>
                <td className="px-4 py-3 font-medium text-navy">{s.respondentName}</td>
                <td className="px-4 py-3 text-ink">{s.respondentCountry}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {[...s.clients].map((c) => (
                      <span key={c} className="inline-flex h-7 items-center rounded-md border border-mist-200 bg-white px-1.5" title={c}>
                        <ClientLogo client={c} size="xs" />
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-navy">{s.rows}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-navy hover:bg-mist-100" onClick={() => downloadOne(s)}>
                    .xlsx
                  </button>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-mist">
                  {records.length ? 'No submissions match the filter.' : 'No submissions yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </Section>
    </div>,
  )
}
