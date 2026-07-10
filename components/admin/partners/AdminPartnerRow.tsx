import { RemoteImage } from "@/components/ui/RemoteImage";
import type { Partner } from "@/lib/site/types";
import { cn } from "@/lib/utils/cn";

type AdminPartnerRowProps = {
  partner: Partner;
  onEdit: () => void;
  onDelete: () => void;
};

export function AdminPartnerRow({ partner, onEdit, onDelete }: AdminPartnerRowProps) {
  return (
    <article
      className={cn(
        "group flex flex-col gap-3 border-b border-white/5 px-4 py-3.5 transition last:border-b-0",
        "hover:bg-white/[0.02]",
        "sm:flex-row sm:items-center",
      )}
    >
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950/80">
        <RemoteImage
          src={partner.image_url}
          alt={partner.name}
          fill
          objectFit="contain"
          className="p-1.5"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-zinc-50">{partner.name}</h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
              partner.is_active
                ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/25"
                : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/25",
            )}
          >
            {partner.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
        {partner.label ? (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{partner.label}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:gap-5">
        <div className="grid grid-cols-2 gap-3 text-center sm:gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Vistas</p>
            <p className="text-sm font-semibold tabular-nums text-zinc-200">
              {partner.view_count.toLocaleString("es-AR")}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Clics</p>
            <p className="text-sm font-semibold tabular-nums text-zinc-200">
              {partner.click_count.toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-purple-400/25 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            onClick={onEdit}
          >
            Editar
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
            onClick={onDelete}
          >
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}
