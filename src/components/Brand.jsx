import logoColor from '../assets/logo-marcomms-color-h.png'
import logoWhite from '../assets/logo-marcomms-white-h.png'
import logoIcon from '../assets/logo-marcomms-icon.png'

export { logoColor, logoWhite, logoIcon }

/**
 * Brand frame following the Control Union style guide:
 *  · light-blue (cyan) bar along the whole top edge
 *  · one dark-blue block: white logo top-left, then the page title
 */
export function BrandHeader({ title, subtitle, eyebrow = 'Inspections · Commercial intelligence', facts = [], right = null, width = 'max-w-6xl' }) {
  return (
    <header>
      <div className="h-1.5 w-full bg-cyan" aria-hidden />
      {/* The dark-blue block is boxed to the same content width as the page body. */}
      <div className={`mx-auto ${width} px-4 pt-4 sm:px-6 sm:pt-6`}>
        <div className="rounded-2xl bg-navy px-5 text-white shadow-[0_8px_24px_-12px_rgba(27,30,66,0.35)] sm:px-8">
          <div className="flex items-center justify-between gap-6 border-b border-white/10 py-4">
            <a href="#/" className="shrink-0" aria-label="MarComms · home">
              <img src={logoWhite} alt="MarComms" className="h-8 w-auto sm:h-9" />
            </a>
            <div className="flex items-center gap-4">
              <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-white/60 md:inline">Peterson and Control Union</span>
              {right}
            </div>
          </div>
          <div className="py-7 sm:py-9">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">{eyebrow}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/80">{subtitle}</p>}
            {facts.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                {facts.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Footer: small icon + attribution on the left, utility links on the right, and the
 * dark-blue bar along the bottom edge that starts at the right and ends aligned with the content.
 */
export function BrandFooter({ links = [], width = 'max-w-6xl' }) {
  return (
    <footer className="mt-12 border-t border-mist-200 bg-white">
      <div className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6`}>
        <div className="flex items-center gap-3">
          <img src={logoIcon} alt="" className="h-7 w-auto" aria-hidden />
          <div className="text-xs leading-tight text-mist">
            <p className="font-semibold text-ink">MarComms · Peterson and Control Union</p>
            <p>Internal use. Answers are stored securely and consolidated by the MarComms team.</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-xs font-medium">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="inline-flex min-h-9 items-center px-1 text-ink hover:text-navy">{l.label}</a>
          ))}
        </nav>
      </div>
      <div className="flex justify-end" aria-hidden>
        <div className="h-2 w-2/3 bg-navy" />
      </div>
    </footer>
  )
}
