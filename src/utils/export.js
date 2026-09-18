import * as XLSX from 'xlsx'

export const pairKey = (client, country) => `${client}|||${country}`
export const splitKey = (key) => key.split('|||')

export const emptyAnswer = () => ({
  services: [],
  serviceOther: '',
  stakeholders: [],
  maturity: null,
  officeType: '',
  importance: null,
  decisions: '',
  gaps: [],
  gapOther: '',
  reasons: [],
  reasonOther: '',
  action: '',
})

const join = (arr) => (arr || []).join('; ')

/** Ordered list of every Client × Country pair currently in the form. */
export function listPairs(form) {
  return form.clients.flatMap((client) =>
    (form.clientCountries[client] || []).map((country) => ({ client, country, key: pairKey(client, country) })),
  )
}

/**
 * A "record" is the neutral shape shared by the live form and the database:
 * { submissionId, submittedAt, respondentName, respondentCountry, client, country, answer }
 */
export function formRecords(form, submissionId = null, submittedAt = new Date().toISOString()) {
  return listPairs(form).map(({ client, country, key }) => ({
    submissionId,
    submittedAt,
    respondentName: form.respondentName,
    respondentCountry: form.respondentCountry,
    client,
    country,
    answer: form.answers[key] || emptyAnswer(),
  }))
}

/** One flat spreadsheet row per record. Column order mirrors the working Excel layout. */
export function toRow(r) {
  const a = r.answer || emptyAnswer()
  return {
    'Respondent Name': r.respondentName,
    'Respondent Country': r.respondentCountry,
    Client: r.client,
    Country: r.country,
    'Q6 Services': join(a.services),
    'Q6 Other service': a.serviceOther || '',
    'Q7 Stakeholder groups': join(a.stakeholders),
    'Q8 Maturity (1-5)': a.maturity ?? '',
    'Q9 Office type': a.officeType || '',
    'Q10 Strategic importance (1-5)': a.importance ?? '',
    'Q11 Decision level': a.decisions || '',
    'Q12 Main gap': join(a.gaps),
    'Q12 Other gap': a.gapOther || '',
    'Q13 Main reason': join(a.reasons),
    'Q13 Other reason': a.reasonOther || '',
    'Q14 Most important action': a.action || '',
    'Submitted at': r.submittedAt || '',
    'Submission ID': r.submissionId || '',
  }
}

export const flattenRows = (form, submittedAt) => formRecords(form, null, submittedAt).map(toRow)

// ---------- database mapping (snake_case columns, see supabase/schema.sql) ----------

export function toDbRows(form, submissionId, submittedAt) {
  return formRecords(form, submissionId, submittedAt).map((r) => ({
    submission_id: r.submissionId,
    submitted_at: r.submittedAt,
    respondent_name: r.respondentName,
    respondent_country: r.respondentCountry,
    client: r.client,
    country: r.country,
    services: r.answer.services,
    service_other: r.answer.serviceOther,
    stakeholders: r.answer.stakeholders,
    maturity: r.answer.maturity,
    office_type: r.answer.officeType,
    importance: r.answer.importance,
    decisions: r.answer.decisions,
    gaps: r.answer.gaps,
    gap_other: r.answer.gapOther,
    reasons: r.answer.reasons,
    reason_other: r.answer.reasonOther,
    action: r.answer.action,
  }))
}

export function dbToRecord(d) {
  return {
    submissionId: d.submission_id,
    submittedAt: d.submitted_at,
    respondentName: d.respondent_name,
    respondentCountry: d.respondent_country,
    client: d.client,
    country: d.country,
    answer: {
      services: d.services || [],
      serviceOther: d.service_other || '',
      stakeholders: d.stakeholders || [],
      maturity: d.maturity,
      officeType: d.office_type || '',
      importance: d.importance,
      decisions: d.decisions || '',
      gaps: d.gaps || [],
      gapOther: d.gap_other || '',
      reasons: d.reasons || [],
      reasonOther: d.reason_other || '',
      action: d.action || '',
    },
  }
}

// ---------- file writers ----------

export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
export const safe = (s) => (s || 'respondent').replace(/[^\w-]+/g, '_').slice(0, 40)

function autoWidth(rows) {
  return Object.keys(rows[0] || {}).map((h) => ({ wch: Math.min(60, Math.max(14, h.length + 2)) }))
}

/** Write an .xlsx with one or more sheets: [{ name, rows }]. */
export function writeXlsx(sheets, filename) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = autoWidth(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, filename)
}

export function writeCsv(rows, filename) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\r\n')
  // Leading BOM so Excel opens the file as UTF-8 (accents in country names).
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportXlsx(form) {
  writeXlsx([{ name: 'Client x Country', rows: flattenRows(form) }], `PCU_ClientCountryMatrix_${safe(form.respondentName)}_${stamp()}.xlsx`)
}

export function exportCsv(form) {
  writeCsv(flattenRows(form), `PCU_ClientCountryMatrix_${safe(form.respondentName)}_${stamp()}.csv`)
}
