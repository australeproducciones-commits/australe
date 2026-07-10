type CommunityDashboardHeaderProps = {
  updatedAt?: string;
};

export function CommunityDashboardHeader({
  updatedAt,
}: CommunityDashboardHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-purple-950/40 p-5 shadow-lg shadow-black/25 sm:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-48 rounded-full bg-cyan-500/5 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-200">
              Administración
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Comunidad
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
            Centro de control de comunidad
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            Monitoreo de fidelización, usuarios, recompensas e invitaciones.
          </p>
        </div>
        {updatedAt ? (
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            Sync · {updatedAt}
          </p>
        ) : null}
      </div>
    </header>
  );
}
