import adm from '../assets/clients/adm.svg'
import bunge from '../assets/clients/bunge.svg'
import cargill from '../assets/clients/cargill.svg'
import cofco from '../assets/clients/cofco.png'
import ldc from '../assets/clients/ldc.svg'

/** Client logos, keyed by the exact client name used in constants.js. */
export const CLIENT_LOGOS = {
  ADM: adm,
  Bunge: bunge,
  Cargill: cargill,
  COFCO: cofco,
  'LDC (Louis Dreyfus)': ldc,
}

const HEIGHTS = { xs: 'h-4', sm: 'h-5', md: 'h-7', lg: 'h-9', xl: 'h-11' }

/** Logo image for a client. Falls back to the name when no logo is known. */
export function ClientLogo({ client, size = 'sm', className = '' }) {
  const src = CLIENT_LOGOS[client]
  if (!src) return <span className={`font-bold text-navy ${className}`}>{client}</span>
  return <img src={src} alt={client} className={`${HEIGHTS[size]} w-auto max-w-[9rem] object-contain ${className}`} />
}

/**
 * Prominent client lockup used wherever a block is about one client: big logo on a white
 * plate plus the name, so the respondent never loses track of which client they are answering for.
 */
export function ClientBanner({ client, subtitle, right = null, size = 'lg' }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex h-14 min-w-[7rem] items-center justify-center rounded-lg border border-mist-200 bg-white px-3 shadow-sm">
        <ClientLogo client={client} size={size} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold leading-tight tracking-tight text-navy">{client}</p>
        {subtitle && <p className="text-sm text-ink">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
