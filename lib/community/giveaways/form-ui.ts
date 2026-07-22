import type { GiveawayEntryType } from "@/lib/community/giveaways/types";

export const GIVEAWAY_ENTRY_TYPE_OPTIONS: {
  value: GiveawayEntryType;
  label: string;
  description: string;
}[] = [
  {
    value: "free",
    label: "Participación gratuita",
    description: "Cada miembro puede participar sin gastar puntos.",
  },
  {
    value: "points",
    label: "Canje de puntos",
    description: "El usuario utiliza puntos de Comunidad para obtener chances.",
  },
  {
    value: "ticket",
    label: "Entrada válida",
    description: "Participan usuarios con una entrada asociada.",
  },
  {
    value: "attendance",
    label: "Asistencia confirmada",
    description: "Participan miembros con asistencia confirmada al evento.",
  },
  {
    value: "store_purchase",
    label: "Compra en tienda",
    description:
      "Se generan chances a partir de pedidos que cumplen los requisitos.",
  },
  {
    value: "automatic",
    label: "Participación automática",
    description:
      "Las chances se asignan automáticamente según las reglas del sorteo.",
  },
  {
    value: "mixed",
    label: "Modalidad combinada",
    description:
      "Combina varias formas de participación según la configuración del sorteo.",
  },
];

export function getEntryTypeLabel(entryType: GiveawayEntryType): string {
  return (
    GIVEAWAY_ENTRY_TYPE_OPTIONS.find((option) => option.value === entryType)
      ?.label ?? entryType
  );
}

export function getEntryTypeDescription(entryType: GiveawayEntryType): string {
  return (
    GIVEAWAY_ENTRY_TYPE_OPTIONS.find((option) => option.value === entryType)
      ?.description ?? ""
  );
}

export function formatGiveawayDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "Sin definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin definir";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SHORT_DESCRIPTION_MAX = 160;
