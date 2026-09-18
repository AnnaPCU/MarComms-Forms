import logoColor from '../assets/logo-marcomms-color-h.png'
import logoWhite from '../assets/logo-marcomms-white-h.png'
import logoIcon from '../assets/logo-marcomms-icon.png'

export { logoColor, logoWhite, logoIcon }

/**
 * Brand frame following the Control Union style guide:
 *  · light-blue (cyan) bar along the whole top edge
 *  · logo top-left with clear space, primary full-colour version on white
 *  · dark-blue band for the page title
 */
export function BrandHeader({ title, subtitle, eyebrow = 'PCU · Commercial intelligence', right = null }) {
  return (
    <header>
      <div className="h-1.5 w-full bg-cyan" aria-hidden />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <a href="#/" className="shrink-0" aria-label="MarComms · home">
            <img src={logoColor} alt="MarComms" className="h-9 w-auto sm:h-10" />
          </a>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-mist sm:inline">{eyebrow}</span>
            {right}
          </div>
        </div>
      </div>
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}

/**
 * Footer: small icon + attribution on the left, utility links on the right, and the
 * dark-blue bar along the bottom edge that starts at the right and ends aligned with the content.
 */
export function BrandFooter({ links = [] }) {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={logoIcon} alt="" className="h-7 w-auto" aria-hidden />
          <div className="text-xs leading-tight text-mist">
            <p className="font-semibold text-ink">MarComms · Peterson and Control Union</p>
            <p>Internal use. Answers are stored securely and consolidated by the MarComms team.</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-xs font-medium">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-mist hover:text-navy">{l.label}</a>
          ))}
        </nav>
      </div>
      <div className="flex justify-end" aria-hidden>
        <div className="h-2 w-2/3 bg-navy" />
      </div>
    </footer>
  )
}
