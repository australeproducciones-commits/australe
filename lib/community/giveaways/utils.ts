import type { CommunityGiveaway, GiveawayStatus } from "@/lib/community/giveaways/types";

export function slugifyGiveawayName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatPublicWinnerName(
  fullName: string | null | undefined,
  userId: string,
): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0] ?? "";
    const lastInitial = parts.length > 1 ? `${parts[parts.length - 1]![0]}.` : "";
    return `${first} ${lastInitial}`.trim();
  }
  return `Miembro #${userId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export function getGiveawayVisualStatus(
  giveaway: CommunityGiveaway,
  participation?: { user_chances: number; is_winner: boolean; is_alternate: boolean; winner_claimed: boolean },
): string {
  const now = Date.now();
  const starts = giveaway.starts_at ? new Date(giveaway.starts_at).getTime() : null;
  const closes = giveaway.closes_at ? new Date(giveaway.closes_at).getTime() : null;

  if (participation?.winner_claimed) return "Premio reclamado";
  if (participation?.is_winner) return "Ganador";
  if (participation?.is_alternate) return "Suplente";
  if (giveaway.status === "drawn") return "Sorteo realizado";
  if (giveaway.status === "cancelled") return "Cancelado";
  if (giveaway.status === "closed") return "Finalizado";
  if (starts && starts > now) return "Próximamente";
  if (closes && closes < now) return "Finalizado";
  if (participation && participation.user_chances > 0) return "Ya estás participando";
  if (giveaway.status === "active") return "Participación abierta";
  if (giveaway.status === "scheduled") return "Próximamente";
  return giveaway.status;
}

export function isGiveawayEnterable(giveaway: CommunityGiveaway): boolean {
  if (giveaway.status !== "active") return false;
  const now = Date.now();
  if (giveaway.starts_at && new Date(giveaway.starts_at).getTime() > now) return false;
  if (giveaway.closes_at && new Date(giveaway.closes_at).getTime() < now) return false;
  return ["free", "points", "mixed"].includes(giveaway.entry_type);
}

export function groupGiveawaysBySection(giveaways: CommunityGiveaway[]) {
  const now = Date.now();
  const active: CommunityGiveaway[] = [];
  const upcoming: CommunityGiveaway[] = [];
  const finished: CommunityGiveaway[] = [];

  for (const g of giveaways) {
    if (g.status === "drawn" || g.status === "closed" || g.status === "cancelled") {
      finished.push(g);
      continue;
    }
    if (g.status === "scheduled" || (g.starts_at && new Date(g.starts_at).getTime() > now)) {
      upcoming.push(g);
      continue;
    }
    if (g.status === "active") {
      active.push(g);
      continue;
    }
    if (g.closes_at && new Date(g.closes_at).getTime() < now) {
      finished.push(g);
    }
  }

  return { active, upcoming, finished };
}

export function entryTypeLabel(entryType: string): string {
  const labels: Record<string, string> = {
    free: "Participación gratuita",
    points: "Canje de puntos",
    ticket: "Entrada válida",
    attendance: "Asistencia confirmada",
    store_purchase: "Compra en tienda",
    automatic: "Participación automática",
    mixed: "Modalidad combinada",
  };
  return labels[entryType] ?? entryType;
}

export function statusLabel(status: GiveawayStatus): string {
  const labels: Record<GiveawayStatus, string> = {
    draft: "Borrador",
    scheduled: "Programado",
    active: "Activo",
    closed: "Cerrado",
    drawn: "Sorteado",
    cancelled: "Cancelado",
  };
  return labels[status];
}

export function msUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  return new Date(dateIso).getTime() - Date.now();
}
