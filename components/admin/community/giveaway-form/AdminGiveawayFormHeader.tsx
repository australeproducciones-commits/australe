import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { statusLabel } from "@/lib/community/giveaways/utils";
import type { GiveawayStatus } from "@/lib/community/giveaways/types";

type AdminGiveawayFormHeaderProps = {
  mode: "create" | "edit";
  status?: GiveawayStatus;
};

export function AdminGiveawayFormHeader({
  mode,
  status = "draft",
}: AdminGiveawayFormHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === "create" ? "Nuevo sorteo" : "Editar sorteo"}
          </h1>
          <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
            {statusLabel(status)}
          </span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Configurá el premio, la forma de participación, las fechas y los requisitos.
        </p>
      </div>
      <Button href={ROUTES.adminComunidadSorteos} variant="outline" size="sm">
        Volver a sorteos
      </Button>
    </div>
  );
}
