// Master lists. Wording follows "ABCCD Survey - Manual Template.xlsx" (sheet Validation)
// so that exports match the working Excel one to one. Values are exported exactly as written here.

export const CLIENTS = ['ADM', 'Bunge', 'Cargill', 'COFCO', 'LDC (Louis Dreyfus)']

export const REGIONS = ['APAC', 'Americas', 'EEMA', 'NEG']

export const COUNTRIES_BY_REGION = {
  APAC: [
    'Australia', 'Bangladesh', 'Cambodia', 'China', 'HongKong', 'India', 'Indonesia', 'Japan',
    'Malaysia', 'Myanmar', 'Pakistan', 'Papua New Guinea', 'Philippines', 'Singapore', 'South Korea',
    'Sri Lanka', 'Taiwan', 'Thailand', 'Vietnam',
  ],
  Americas: [
    'Argentina', 'Bolivia', 'Brasil', 'Canada', 'Chile', 'Colombia', 'Dominican Republic', 'Ecuador',
    'Guatemala', 'Mexico', 'Paraguay', 'Peru', 'Portugal', 'Spain', 'Uruguay', 'USA',
  ],
  EEMA: [
    'Azerbaijan', 'Bulgaria', 'Croatia', 'Cyprus', 'Egypt', 'Ethiopia', 'France', 'Ghana', 'Greece',
    'Hungary', 'Iran', 'Israel', 'Italy', 'Ivory Coast', 'Kazakhstan', 'Kenya', 'Latvia',
    'Latvia / Branch Office of Russia', 'Lebanon', 'Moldova, Republic of', 'Morocco', 'Mozambique',
    'Romania', 'Russia', 'Rwanda', 'Serbia', 'South Africa', 'Switzerland', 'Tanzania', 'Tunisia',
    'Turkiye', 'Uganda', 'Ukraine', 'Uzbekistan',
  ],
  NEG: ['Belgium', 'Denmark', 'Finland', 'Germany', 'Netherlands', 'Norway', 'Poland', 'Qatar', 'Sweden', 'UAE', 'UK'],
}

/** country → region */
export const COUNTRY_REGION = Object.fromEntries(
  REGIONS.flatMap((r) => COUNTRIES_BY_REGION[r].map((c) => [c, r])),
)

/** All countries, in region order then list order (used for stable sorting). */
export const ALL_COUNTRIES = REGIONS.flatMap((r) => COUNTRIES_BY_REGION[r])

/** Respondent country dropdown: every country, alphabetical. */
export const RESPONDENT_COUNTRIES = [...ALL_COUNTRIES].sort((a, b) => a.localeCompare(b))

// Q6
export const SERVICES = [
  'Bunker survey', 'Condition', 'Container stripping', 'Container stuffing',
  'Contractual sampling', 'Customized sampling', 'Damage survey', 'Disinfection',
  'Dockside analysis', 'Draught survey', 'Gauging', 'Hold sealing', 'Hold unsealing',
  'Holds inspection', 'Load Compartment Inspection (LCI)', 'Nitrate test',
  'Pre inspection shipment', 'Loading Supervision', 'Discharge Supervision',
  'Weight inspection', 'Truck loading', 'Vessel supervision', 'Stock Check',
  'GMO Sampling', 'Other',
]
export const SERVICE_OTHER = 'Other'

// Q7
export const STAKEHOLDERS = ['Operations', 'Quality', 'Procurement', 'Commercial', 'Management', 'Sustainability']

// Q8
export const MATURITY = [
  'Strategic relationship (regular engagement with decision-makers)',
  'Operational relationship (regular operational contact only)',
  'Limited relationship (one or two contacts)',
  'No relationship',
]

// Q9
export const OFFICE_TYPES = [
  'Execution Office (we physically deliver the service)',
  'Relationship Office (we manage the relationship, execution may sit elsewhere)',
  'Both',
]

// Q10
export const IMPORTANCE = ['Critical', 'High', 'Medium', 'Low']

// Q11
export const DECISION_LEVELS = ['Local', 'Regional', 'Global', 'Unknown']

// Q12
export const GAPS = [
  "Capability Gap (we don't offer enough services)",
  'Business Coverage Gap (we are not covering flows)',
  "Access Gap (we don't know decision-makers)",
  'Coordination Gap (internal / cross-country)',
  'No clear gap',
  'Other (please specify)',
]
export const MAX_GAPS = 2

// Q13 (one reason per gap chosen in Q12)
export const REASONS = [
  'We do not know who the decision-maker is',
  'Competitor strongly positioned',
  'Client not aware of our capabilities',
  'No local capability',
  'Lack of internal coordination',
  'Decision taken at global level',
  'Low priority / limited volume',
  'Other (please specify)',
]

export const OTHER_SPECIFY = 'Other (please specify)'

/** Corporate email domains accepted for respondents (sub-domains such as ar.pcugroup.com are accepted too). */
export const EMAIL_DOMAINS = ['pcugroup.com', 'onepeterson.com', 'controlunion.com']
const CORPORATE_EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)*(pcugroup|onepeterson|controlunion)\.com$/i
export const isCompanyEmail = (v) => CORPORATE_EMAIL_RE.test((v || '').trim())

/** Question texts exactly as in the template header row (sheet Survey, A1:N1). */
export const QUESTIONS = {
  respondentName: 'Respondent corporate email',
  respondentCountry: 'Respondent country',
  client: 'Which of the following clients do you currently work with or have an active relationship with?',
  region: 'Which region do you work with?',
  country: 'Which country?',
  q6: 'What service do you provide to this country?',
  q7: 'Which stakeholder groups do you actively know within this entity?',
  q8: 'How would you rate the maturity of your relationship with this entity?',
  q9: 'Is our relationship with this entity as an executing office, a coordination/relationship-management office, or both?',
  q10: 'How strategically important is this entity for us?',
  q11: 'Where are decisions made for this entity?',
  q12: 'What is the MAIN gap? (select up to 2)',
  q13: 'What is the MAIN reason for this gap? (select up to 2, once per gap chosen in Q12)',
  q14: 'What is the single most important action PCU should take during the next 6 months to strengthen this relationship?',
}
