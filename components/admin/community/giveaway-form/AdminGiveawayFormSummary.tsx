import { Card } from "@/components/ui/Card";
import {
  formatGiveawayDateTime,
  getEntryTypeLabel,
} from "@/lib/community/giveaways/form-ui";
import type { GiveawayEntryType } from "@/lib/community/giveaways/types";
import { cn } from "@/lib/utils/cn";

export type GiveawayFormSummaryState = {
  name: string;
  prizeDescription: string;
  entryType: GiveawayEntryType;
  pointsCost: number;
  allowMultiple: boolean;
  maxEntries: number | null;
  winnerCount: number;
  alternateCount: number;
  startsAt: string;
  closesAt: string;
  drawAt: string;
  claimDeadline: string;
  hasMainInfo: boolean;
  hasPrize: boolean;
  hasEntryType: boolean;
  hasValidDates: boolean;
  hasTerms: boolean;
};

type AdminGiveawayFormSummaryProps = {
  state: GiveawayFormSummaryState;
  className?: string;
};

function ChecklistItem({
  done,
  label,
}: {
  done: boolean;
  label: string;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          done
            ? "bg-emerald-500/20 text-emerald-300"
            : "border border-zinc-600 text-zinc-600",
        )}
        aria-hidden="true"
      >
        {done ? "✓" : ""}
      </span>
      <span className={done ? "text-zinc-300" : "text-zinc-500"}>{label}</span>
    </li>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

export function AdminGiveawayFormSummary({
  state,
  className,
}: AdminGiveawayFormSummaryProps) {
  const participationLabel = state.allowMultiple
    ? state.maxEntries && state.maxEntries > 1
      ? `Hasta ${state.maxEntries} por usuario`
      : "Múltiples por usuario"
    : "1 por usuario";

  const costLabel =
    state.entryType === "free"
      ? "Sin costo en puntos"
      : state.entryType === "points" || state.entryType === "mixed"
        ? state.pointsCost > 0
          ? `${state.pointsCost} puntos por chance`
          : "Costo pendiente"
        : "Según modalidad";

  const winnersLabel = `${state.winnerCount} ganador${state.winnerCount === 1 ? "" : "es"}${
    state.alternateCount > 0
      ? ` · ${state.alternateCount} suplente${state.alternateCount === 1 ? "" : "s"}`
      : ""
  }`;

  const completedCount = [
    state.hasMainInfo,
    state.hasPrize,
    state.hasEntryType,
    state.hasValidDates,
    state.hasTerms,
  ].filter(Boolean).length;

  return (
    <Card
      padding="md"
      className={cn("space-y-5 lg:sticky lg:top-6", className)}
    >
      <div>
        <h2 className="text-base font-semibold text-white">Resumen del sorteo</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {completedCount}/5 secciones listas
        </p>
      </div>

      <dl className="space-y-4">
        <SummaryRow
          label="Nombre"
          value={state.name.trim() || "Sin nombre"}
        />
        <SummaryRow
          label="Premio"
          value={state.prizeDescription.trim() || "Sin definir"}
        />
        <SummaryRow label="Modalidad" value={getEntryTypeLabel(state.entryType)} />
        <SummaryRow label="Costo" value={costLabel} />
        <SummaryRow label="Participaciones" value={participationLabel} />
        <SummaryRow label="Resultado" value={winnersLabel} />
        <SummaryRow
          label="Inicio"
          value={formatGiveawayDateTime(state.startsAt || null)}
        />
        <SummaryRow
          label="Cierre"
          value={formatGiveawayDateTime(state.closesAt || null)}
        />
      </dl>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
        <p className="font-medium text-zinc-300">Cronología</p>
        <p className="mt-2 leading-5">
          {formatGiveawayDateTime(state.startsAt || null)}
          {" → "}
          {formatGiveawayDateTime(state.closesAt || null)}
          {" → "}
          {formatGiveawayDateTime(state.drawAt || null)}
          {" → "}
          {formatGiveawayDateTime(state.claimDeadline || null)}
        </p>
      </div>

      <ul className="space-y-2" aria-label="Estado de configuración">
        <ChecklistItem done={state.hasMainInfo} label="Información principal completa" />
        <ChecklistItem done={state.hasPrize} label="Premio definido" />
        <ChecklistItem done={state.hasEntryType} label="Modalidad configurada" />
        <ChecklistItem done={state.hasValidDates} label="Fechas válidas" />
        <ChecklistItem done={state.hasTerms} label="Bases cargadas" />
      </ul>

      <p className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-xs leading-5 text-zinc-400">
        El sorteo se guardará como borrador. Podrás revisarlo antes de activarlo.
      </p>
    </Card>
  );
}
