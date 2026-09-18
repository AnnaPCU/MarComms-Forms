import { useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured, TABLE } from '../lib/supabase'
import { dbToRecord, toRow, writeXlsx, writeCsv, stamp, safe } from '../utils/export'
import { Button, Field, TextInput, Badge } from '../components/ui'

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
        { name: 'Client x Country', rows: records.map(toRow) },
        { name: 'Submissions', rows: summaryRows(submissions) },
      ],
      `PCU_ClientCountryMatrix_ALL_${stamp()}.xlsx`,
    )
  }
  const downloadAllCsv = () => writeCsv(records.map(toRow), `PCU_ClientCountryMatrix_ALL_${stamp()}.csv`)
  const downloadOne = (s) => {
    const rows = records.filter((r) => r.submissionId === s.submissionId).map(toRow)
    writeXlsx([{ name: 'Client x Country', rows }], `PCU_ClientCountryMatrix_${safe(s.respondentName)}_${s.submittedAt.slice(0, 10)}.xlsx`)
  }

  // ---------- render ----------
  const shell = (children) => (
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">PCU · Commercial intelligence</p>
            <h1 className="text-xl font-bold">Client × Country Matrix · Admin</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="#/" className="text-white/75 hover:text-white">← Form</a>
            {session && (
              <Button variant="secondary" className="!border-white/40 !bg-transparent !text-white hover:!bg-white/10" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )

  if (!isConfigured) {
    return shell(
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see SETUP.md).
      </p>,
    )
  }

  if (!authReady) return shell(<p className="text-sm text-mist">Loading…</p>)

  if (!session) {
    return shell(
      <form onSubmit={signIn} className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <p className="mt-4 text-xs text-mist">Admin accounts are created in the Supabase dashboard (Authentication → Users).</p>
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
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-mist">{label}</p>
            <p className="mt-1 text-3xl font-bold text-navy">{loading ? '…' : n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Button onClick={downloadAll} disabled={!records.length}>Download consolidated Excel</Button>
        <Button variant="secondary" onClick={downloadAllCsv} disabled={!records.length}>Download .csv</Button>
        <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
        <div className="ml-auto w-full sm:w-64">
          <TextInput placeholder="Filter by respondent, country or client…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {loadError && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load responses: {loadError}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-mist">
            <tr>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Respondent</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Clients</th>
              <th className="px-4 py-3 text-right">Rows</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((s) => (
              <tr key={s.submissionId} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(s.submittedAt)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{s.respondentName}</td>
                <td className="px-4 py-3 text-slate-600">{s.respondentCountry}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {[...s.clients].map((c) => <Badge key={c} tone="navy">{c}</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-navy">{s.rows}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-xs font-semibold text-navy hover:underline" onClick={() => downloadOne(s)}>
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
    </div>,
  )
}
