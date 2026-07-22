import type { AdvertisingCampaign } from "@/lib/site/types";

export const ADVERTISING_PLACEMENT_LABEL =
  "Modal post-login · Tras ingresar";

export const ADVERTISING_FILTER_STATUS = {
  ALL: "all",
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  PAUSED: "paused",
  FINISHED: "finished",
} as const;

export type AdvertisingFilterStatus =
  (typeof ADVERTISING_FILTER_STATUS)[keyof typeof ADVERTISING_FILTER_STATUS];

export const ADVERTISING_SORT = {
  RECENT: "recent",
  OLDEST: "oldest",
  STARTS: "starts",
  ENDS: "ends",
  VIEWS: "views",
  CLICKS: "clicks",
  CTR: "ctr",
} as const;

export type AdvertisingSort =
  (typeof ADVERTISING_SORT)[keyof typeof ADVERTISING_SORT];

export type AdvertisingDisplayStatusKind =
  | "active"
  | "scheduled"
  | "paused"
  | "finished"
  | "incomplete";

export type AdvertisingDisplayStatus = {
  kind: AdvertisingDisplayStatusKind;
  badgeLabel: string;
  scheduleIndicator: string;
  scheduleTitle: string;
  scheduleDetail: string;
  schedulePrefix: string | null;
};

export type AdvertisingOperationalStats = {
  activeCount: number;
  endingSoonCount: number;
  withoutDestinationCount: number;
  withoutImageCount: number;
  hasIssues: boolean;
  systemLabel: string;
  systemTone: "ok" | "warn" | "error" | "idle";
};

export function computeAdvertisingOperationalStats(
  campaigns: AdvertisingCampaign[],
): AdvertisingOperationalStats {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  let activeCount = 0;
  let endingSoonCount = 0;
  let withoutDestinationCount = 0;
  let withoutImageCount = 0;

  for (const campaign of campaigns) {
    const display = getAdvertisingDisplayStatus(campaign);
    if (display.kind === "active" || display.kind === "incomplete") {
      activeCount += 1;
      if (
        campaign.ends_at &&
        Date.parse(campaign.ends_at) > now &&
        Date.parse(campaign.ends_at) - now <= weekMs
      ) {
        endingSoonCount += 1;
      }
    }

    if (campaign.is_active && !campaign.destination_url?.trim()) {
      withoutDestinationCount += 1;
    }

    if (campaign.is_active && !campaign.image_url?.trim()) {
      withoutImageCount += 1;
    }
  }

  const hasIssues = withoutDestinationCount > 0 || withoutImageCount > 0;

  if (campaigns.length === 0) {
    return {
      activeCount: 0,
      endingSoonCount: 0,
      withoutDestinationCount: 0,
      withoutImageCount: 0,
      hasIssues: false,
      systemLabel: "Sin campañas configuradas",
      systemTone: "idle",
    };
  }

  if (hasIssues) {
    return {
      activeCount,
      endingSoonCount,
      withoutDestinationCount,
      withoutImageCount,
      hasIssues: true,
      systemLabel: "Revisar configuración",
      systemTone: "error",
    };
  }

  if (endingSoonCount > 0 || activeCount === 0) {
    return {
      activeCount,
      endingSoonCount,
      withoutDestinationCount,
      withoutImageCount,
      hasIssues: false,
      systemLabel:
        endingSoonCount > 0
          ? "Hay campañas próximas a finalizar"
          : "Sin campañas activas en este momento",
      systemTone: "warn",
    };
  }

  return {
    activeCount,
    endingSoonCount,
    withoutDestinationCount,
    withoutImageCount,
    hasIssues: false,
    systemLabel: "Sistema publicitario operativo",
    systemTone: "ok",
  };
}

export function getDestinationTypeLabel(url: string | null | undefined): string {
  const destination = url?.trim();
  if (!destination) {
    return "Sin enlace";
  }
  if (destination.startsWith("/")) {
    if (destination.startsWith("/eventos")) return "Evento";
    if (destination.startsWith("/tienda")) return "Tienda";
    if (destination.startsWith("/comunidad/sorteos")) return "Sorteo";
    return "Página interna";
  }
  return "Enlace externo";
}

export function formatDestinationDomain(url: string | null | undefined): string {
  const destination = url?.trim();
  if (!destination) {
    return "—";
  }
  if (destination.startsWith("/")) {
    return "australeproducciones.com";
  }
  try {
    return new URL(destination).hostname.replace(/^www\./, "");
  } catch {
    return destination.slice(0, 40);
  }
}

export function truncateDestinationUrl(url: string | null | undefined): string {
  const destination = url?.trim();
  if (!destination) {
    return "—";
  }
  if (destination.length <= 48) {
    return destination;
  }
  return `${destination.slice(0, 45)}…`;
}

export type AdvertisingSummary = {
  total: number;
  active: number;
  scheduled: number;
  paused: number;
  finished: number;
  totalViews: number;
  totalClicks: number;
  ctr: number;
};

export function formatAdvertisingDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}

export function formatAdvertisingNumber(value: number): string {
  return value.toLocaleString("es-AR");
}

export function formatAdvertisingCtr(views: number, clicks: number): string {
  if (views <= 0) {
    return "0 %";
  }
  const ctr = (clicks / views) * 100;
  return `${ctr.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} %`;
}

export function computeAdvertisingCtr(views: number, clicks: number): number {
  if (views <= 0) {
    return 0;
  }
  return (clicks / views) * 100;
}

function isCampaignIncomplete(campaign: AdvertisingCampaign): boolean {
  return (
    campaign.is_active &&
    (!campaign.image_url?.trim() || !campaign.destination_url?.trim())
  );
}

export function getAdvertisingDisplayStatus(
  campaign: AdvertisingCampaign,
  now = new Date(),
): AdvertisingDisplayStatus {
  const nowMs = now.getTime();
  const startsMs = campaign.starts_at ? Date.parse(campaign.starts_at) : null;
  const endsMs = campaign.ends_at ? Date.parse(campaign.ends_at) : null;

  if (endsMs !== null && !Number.isNaN(endsMs) && endsMs <= nowMs) {
    return {
      kind: "finished",
      badgeLabel: "FINALIZADA",
      scheduleIndicator: "■",
      scheduleTitle: "FINALIZADA",
      schedulePrefix: "Terminó",
      scheduleDetail: campaign.ends_at
        ? formatAdvertisingDateTime(campaign.ends_at)
        : "—",
    };
  }

  if (!campaign.is_active) {
    return {
      kind: "paused",
      badgeLabel: "PAUSADA",
      scheduleIndicator: "Ⅱ",
      scheduleTitle: "PAUSADA",
      schedulePrefix: null,
      scheduleDetail: "Fuera de emisión",
    };
  }

  if (startsMs !== null && !Number.isNaN(startsMs) && startsMs > nowMs) {
    return {
      kind: "scheduled",
      badgeLabel: "PROGRAMADA",
      scheduleIndicator: "○",
      scheduleTitle: "PROGRAMADA",
      schedulePrefix: "Comienza",
      scheduleDetail: formatAdvertisingDateTime(campaign.starts_at!),
    };
  }

  if (isCampaignIncomplete(campaign)) {
    return {
      kind: "incomplete",
      badgeLabel: "INCOMPLETA",
      scheduleIndicator: "●",
      scheduleTitle: "EN EMISIÓN",
      schedulePrefix: endsMs ? "Finaliza" : null,
      scheduleDetail: endsMs
        ? formatAdvertisingDateTime(campaign.ends_at!)
        : "Sin fecha de finalización",
    };
  }

  return {
    kind: "active",
    badgeLabel: "ACTIVA",
    scheduleIndicator: "●",
    scheduleTitle: "EN EMISIÓN",
    schedulePrefix: endsMs ? "Finaliza" : null,
    scheduleDetail: endsMs
      ? formatAdvertisingDateTime(campaign.ends_at!)
      : "Sin fecha de finalización",
  };
}

export function getAdvertisingAlerts(
  campaign: AdvertisingCampaign,
  display: AdvertisingDisplayStatus,
): string[] {
  const alerts: string[] = [];

  if (campaign.is_active && !campaign.image_url?.trim()) {
    alerts.push("Activa sin imagen");
  }

  if (campaign.is_active && !campaign.destination_url?.trim()) {
    alerts.push("Activa sin destino");
  }

  if (
    campaign.is_active &&
    campaign.ends_at &&
    Date.parse(campaign.ends_at) <= Date.now()
  ) {
    alerts.push("La vigencia terminó pero continúa marcada como activa");
  }

  if (
    campaign.starts_at &&
    campaign.ends_at &&
    Date.parse(campaign.ends_at) <= Date.parse(campaign.starts_at)
  ) {
    alerts.push("La fecha de fin es anterior a la de inicio");
  }

  if (display.kind === "scheduled" && !campaign.starts_at) {
    alerts.push("Programada sin fecha de inicio");
  }

  const destination = campaign.destination_url?.trim();
  if (destination && !isValidDestinationUrl(destination)) {
    alerts.push("URL de destino inválida");
  }

  return alerts;
}

export function isValidAdvertisingDestination(
  value: string | null | undefined,
): boolean {
  const destination = value?.trim();

  if (!destination) {
    return false;
  }

  const lower = destination.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  if (destination.startsWith("/") && !destination.startsWith("//")) {
    return destination.length > 1;
  }

  if (destination.startsWith("//")) {
    return false;
  }

  try {
    const parsed = new URL(destination);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** @deprecated Usar isValidAdvertisingDestination */
export function isValidDestinationUrl(url: string): boolean {
  return isValidAdvertisingDestination(url);
}

export function formatDestinationLabel(url: string | null): string {
  if (!url?.trim()) {
    return "—";
  }
  const trimmed = url.trim();
  try {
    if (trimmed.startsWith("/")) {
      return trimmed;
    }
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

export function computeAdvertisingSummary(
  campaigns: AdvertisingCampaign[],
): AdvertisingSummary {
  let active = 0;
  let scheduled = 0;
  let paused = 0;
  let finished = 0;
  let totalViews = 0;
  let totalClicks = 0;

  for (const campaign of campaigns) {
    const display = getAdvertisingDisplayStatus(campaign);
    switch (display.kind) {
      case "active":
      case "incomplete":
        active += 1;
        break;
      case "scheduled":
        scheduled += 1;
        break;
      case "paused":
        paused += 1;
        break;
      case "finished":
        finished += 1;
        break;
    }
    totalViews += campaign.view_count;
    totalClicks += campaign.click_count;
  }

  return {
    total: campaigns.length,
    active,
    scheduled,
    paused,
    finished,
    totalViews,
    totalClicks,
    ctr: computeAdvertisingCtr(totalViews, totalClicks),
  };
}

function filterKindForStatus(
  status: AdvertisingFilterStatus,
): AdvertisingDisplayStatusKind | null {
  switch (status) {
    case ADVERTISING_FILTER_STATUS.ACTIVE:
      return "active";
    case ADVERTISING_FILTER_STATUS.SCHEDULED:
      return "scheduled";
    case ADVERTISING_FILTER_STATUS.PAUSED:
      return "paused";
    case ADVERTISING_FILTER_STATUS.FINISHED:
      return "finished";
    default:
      return null;
  }
}

function matchesDisplayFilter(
  campaign: AdvertisingCampaign,
  status: AdvertisingFilterStatus,
): boolean {
  if (status === ADVERTISING_FILTER_STATUS.ALL) {
    return true;
  }

  const display = getAdvertisingDisplayStatus(campaign);
  const target = filterKindForStatus(status);

  if (status === ADVERTISING_FILTER_STATUS.ACTIVE) {
    return display.kind === "active" || display.kind === "incomplete";
  }

  return display.kind === target;
}

export function filterAndSortAdvertisingCampaigns(
  campaigns: AdvertisingCampaign[],
  params: {
    search?: string;
    status?: AdvertisingFilterStatus;
    sort?: AdvertisingSort;
  },
): AdvertisingCampaign[] {
  const search = params.search?.trim().toLowerCase() ?? "";
  const status = params.status ?? ADVERTISING_FILTER_STATUS.ALL;
  const sort = params.sort ?? ADVERTISING_SORT.RECENT;

  let result = campaigns.filter((campaign) => {
    if (search) {
      const haystack = [
        campaign.internal_name,
        campaign.title,
        campaign.body,
        campaign.destination_url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return matchesDisplayFilter(campaign, status);
  });

  result = [...result].sort((a, b) => {
    switch (sort) {
      case ADVERTISING_SORT.STARTS: {
        const aStart = a.starts_at ? Date.parse(a.starts_at) : Number.MAX_SAFE_INTEGER;
        const bStart = b.starts_at ? Date.parse(b.starts_at) : Number.MAX_SAFE_INTEGER;
        return aStart - bStart;
      }
      case ADVERTISING_SORT.ENDS: {
        const aEnd = a.ends_at ? Date.parse(a.ends_at) : Number.MAX_SAFE_INTEGER;
        const bEnd = b.ends_at ? Date.parse(b.ends_at) : Number.MAX_SAFE_INTEGER;
        return aEnd - bEnd;
      }
      case ADVERTISING_SORT.VIEWS:
        return b.view_count - a.view_count;
      case ADVERTISING_SORT.CLICKS:
        return b.click_count - a.click_count;
      case ADVERTISING_SORT.CTR: {
        const aCtr = computeAdvertisingCtr(a.view_count, a.click_count);
        const bCtr = computeAdvertisingCtr(b.view_count, b.click_count);
        return bCtr - aCtr;
      }
      case ADVERTISING_SORT.OLDEST:
        return (
          Date.parse(a.created_at) - Date.parse(b.created_at) ||
          a.priority - b.priority
        );
      case ADVERTISING_SORT.RECENT:
      default:
        return (
          Date.parse(b.created_at) - Date.parse(a.created_at) ||
          b.priority - a.priority
        );
    }
  });

  return result;
}

export function parseAdvertisingFilterStatus(
  value?: string,
): AdvertisingFilterStatus {
  const values = Object.values(ADVERTISING_FILTER_STATUS);
  if (value && values.includes(value as AdvertisingFilterStatus)) {
    return value as AdvertisingFilterStatus;
  }
  return ADVERTISING_FILTER_STATUS.ALL;
}

export function parseAdvertisingSort(value?: string): AdvertisingSort {
  const values = Object.values(ADVERTISING_SORT);
  if (value && values.includes(value as AdvertisingSort)) {
    return value as AdvertisingSort;
  }
  return ADVERTISING_SORT.RECENT;
}
