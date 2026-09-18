/** Sticky, real-time completion bar. Sits right under the header and stays visible while scrolling. */
export default function ProgressBar({ percent, label }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-2.5">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ink/80">Progress</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-label="Form completion">
          <div className={`h-full rounded-full transition-all duration-500 ${p >= 100 ? 'bg-emerald-500' : 'bg-cyan'}`} style={{ width: `${p}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-navy">{p}%</span>
        <span className="hidden shrink-0 text-xs text-ink/80 sm:inline">{label}</span>
      </div>
    </div>
  )
}
