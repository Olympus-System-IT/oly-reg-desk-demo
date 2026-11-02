import { ShieldCheck, Sparkles } from "lucide-react";

export function BrandPanel() {
  return (
    <aside
      aria-label="Brand introduction"
      className="relative flex w-full flex-col justify-between bg-primary p-8 text-primary-foreground lg:p-12 overflow-hidden select-none"
    >
      {/* Subtle decorative background shapes */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-28 size-96 rounded-full bg-black/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Small Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
          <Sparkles className="size-3.5 text-amber-300" />
          <span>Outpatient Platform</span>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/85">
          Authorized Staff
        </span>
      </div>

      {/* Hero Centerpiece: Highlighted Company Logo */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center py-8">
        {/* Prominently Highlighted Logo Container */}
        <div className="group relative flex size-44 sm:size-48 items-center justify-center rounded-2xl bg-white p-3.5 shadow-2xl ring-4 ring-white/20 transition-transform duration-300 hover:scale-105 motion-reduce:transform-none">
          <img
            src="/logo.png"
            alt="Olympus Lanka Hospital Logo"
            className="size-full object-contain"
            loading="eager"
          />
        </div>

        {/* Hospital Brand Identity */}
        <div className="mt-8 space-y-3 max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight text-white lg:text-3xl leading-tight">
            Olympus Lanka Hospital
          </h2>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            <span className="size-1.5 rounded-full bg-brand-red" />
            <span>Hospital Management System</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed pt-1">
            Excellence in outpatient healthcare, clinical scheduling, patient queue advancement, and verified financial reconciliation.
          </p>
        </div>
      </div>

      {/* Discreet Footer */}
      <footer className="relative z-10 border-t border-white/15 pt-4 text-xs text-white/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-white/80" />
          <span>Olympus Lanka Hospital · Staff Portal</span>
        </div>
        <span className="font-mono text-[11px] text-white/60">v1.4</span>
      </footer>
    </aside>
  );
}
