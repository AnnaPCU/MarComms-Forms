import * as XLSX from 'xlsx'
import { COUNTRY_REGION, QUESTIONS } from '../data/constants.js'

export const pairKey = (client, country) => `${client}|||${country}`
export const splitKey = (key) => key.split('|||')

export const emptyAnswer = () => ({
  services: [],
  serviceOther: '',
  stakeholders: [],
  maturity: '',
  officeType: '',
  importance: '',
  decisions: '',
  gaps: [],
  gapOther: '',
  reasons: {}, // { [gap]: reason }
  reasonOther: '',
  action: '',
})

const join = (arr) => (arr || []).join('; ')

/** Reasons in the same order as the gaps they belong to (column M aligns with column L). */
export const reasonsInGapOrder = (a) => (a.gaps || []).map((g) => (a.reasons || {})[g] || '')

/** Ordered list of every Client × Country pair currently in the form. */
export function listPairs(form) {
  return form.clients.flatMap((client) =>
    (form.clientCountries[client] || []).map((country) => ({
      client,
      country,
      region: COUNTRY_REGION[country] || '',
      key: pairKey(client, country),
    })),
  )
}

/**
 * A "record" is the neutral shape shared by the live form and the database:
 * { submissionId, submittedAt, respondentName, respondentCountry, client, region, country, answer }
 */
export function formRecords(form, submissionId = null, submittedAt = new Date().toISOString()) {
  return listPairs(form).map(({ client, country, region, key }) => ({
    submissionId,
    submittedAt,
    respondentName: form.respondentName,
    respondentCountry: form.respondentCountry,
    client,
    region,
    country,
    answer: form.answers[key] || emptyAnswer(),
  }))
}

/** One flat spreadsheet row per record. Headers and order match the template sheet "Survey" (A–N). */
export function toRow(r) {
  const a = { ...emptyAnswer(), ...(r.answer || {}) }
  const services = a.services.includes('Other') && a.serviceOther
    ? a.services.map((s) => (s === 'Other' ? `Other: ${a.serviceOther}` : s))
    : a.services
  const gaps = a.gapOther
    ? a.gaps.map((g) => (g.startsWith('Other') ? `Other: ${a.gapOther}` : g))
    : a.gaps
  const reasons = reasonsInGapOrder(a).map((x) => (x.startsWith('Other') && a.reasonOther ? `Other: ${a.reasonOther}` : x))
  return {
    [QUESTIONS.respondentName]: r.respondentName,
    [QUESTIONS.respondentCountry]: r.respondentCountry,
    [QUESTIONS.client]: r.client,
    [QUESTIONS.region]: r.region || COUNTRY_REGION[r.country] || '',
    [QUESTIONS.country]: r.country,
    [QUESTIONS.q6]: join(services),
    [QUESTIONS.q7]: join(a.stakeholders),
    [QUESTIONS.q8]: a.maturity,
    [QUESTIONS.q9]: a.officeType,
    [QUESTIONS.q10]: a.importance,
    [QUESTIONS.q11]: a.decisions,
    [QUESTIONS.q12]: join(gaps),
    [QUESTIONS.q13]: join(reasons),
    [QUESTIONS.q14]: a.action,
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
    region: r.region,
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
    reasons: reasonsInGapOrder(r.answer),
    reason_other: r.answer.reasonOther,
    action: r.answer.action,
  }))
}

export function dbToRecord(d) {
  const gaps = d.gaps || []
  const reasonsArr = d.reasons || []
  return {
    submissionId: d.submission_id,
    submittedAt: d.submitted_at,
    respondentName: d.respondent_name,
    respondentCountry: d.respondent_country,
    client: d.client,
    region: d.region || COUNTRY_REGION[d.country] || '',
    country: d.country,
    answer: {
      services: d.services || [],
      serviceOther: d.service_other || '',
      stakeholders: d.stakeholders || [],
      maturity: d.maturity == null ? '' : String(d.maturity),
      officeType: d.office_type || '',
      importance: d.importance == null ? '' : String(d.importance),
      decisions: d.decisions || '',
      gaps,
      gapOther: d.gap_other || '',
      reasons: Object.fromEntries(gaps.map((g, i) => [g, reasonsArr[i] || ''])),
      reasonOther: d.reason_other || '',
      action: d.action || '',
    },
  }
}

// ---------- file writers ----------

export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
export const safe = (s) => (s || 'respondent').replace(/[^\w-]+/g, '_').slice(0, 40)

function autoWidth(rows) {
  return Object.keys(rows[0] || {}).map((h) => ({ wch: Math.min(60, Math.max(14, Math.round(h.length * 0.6))) }))
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
  // Leading BOM so Excel opens the file as UTF-8.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportXlsx(form) {
  writeXlsx([{ name: 'Survey', rows: flattenRows(form) }], `ABCCD_Survey_${safe(form.respondentName)}_${stamp()}.xlsx`)
}

export function exportCsv(form) {
  writeCsv(flattenRows(form), `ABCCD_Survey_${safe(form.respondentName)}_${stamp()}.csv`)
}
