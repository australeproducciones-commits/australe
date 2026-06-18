/** Zona horaria operativa de Australe Producciones (Mendoza). */
export const EVENT_TIMEZONE = "America/Argentina/Mendoza";

/** Offset fijo UTC-3 (Mendoza no usa DST desde 2009). */
const MENDOZA_OFFSET = "-03:00";

export type EventTimingState =
  | "upcoming_many"
  | "upcoming_one"
  | "today_before_start"
  | "in_progress"
  | "finished"
  | "finished_ago";

export type EventTimingResult = {
  state: EventTimingState;
  calendarDaysUntilStart: number;
  daysSinceEnd: number;
  shortLabel: string;
  fullLabel: string;
  isFinished: boolean;
  isInProgress: boolean;
  isUpcoming: boolean;
};

function calendarDateInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function diffCalendarDays(fromYmd: string, toYmd: string): number {
  const from = new Date(`${fromYmd}T12:00:00${MENDOZA_OFFSET}`);
  const to = new Date(`${toYmd}T12:00:00${MENDOZA_OFFSET}`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function normalizeTime(time: string | null, fallback: string): string {
  if (!time) {
    return fallback;
  }

  return time.length === 5 ? `${time}:00` : time;
}

/** Convierte fecha + hora del evento a instante UTC asumiendo hora local de Mendoza. */
export function mendozaEventInstant(
  eventDate: string,
  time: string | null,
  mode: "start" | "end",
): Date {
  const fallback = mode === "start" ? "00:00:00" : "23:59:59";
  const normalized = normalizeTime(time, fallback);
  return new Date(`${eventDate}T${normalized}${MENDOZA_OFFSET}`);
}

export function getEventTiming(
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  now: Date = new Date(),
): EventTimingResult {
  const today = calendarDateInTz(now, EVENT_TIMEZONE);
  const calendarDaysUntilStart = diffCalendarDays(today, eventDate);

  const startAt = mendozaEventInstant(eventDate, startTime, "start");
  const endAt = endTime
    ? mendozaEventInstant(eventDate, endTime, "end")
    : startTime
      ? new Date(
          mendozaEventInstant(eventDate, startTime, "start").getTime() +
            4 * 60 * 60 * 1000,
        )
      : mendozaEventInstant(eventDate, null, "end");

  const nowMs = now.getTime();

  if (nowMs >= endAt.getTime()) {
    const daysSinceEnd = Math.max(
      0,
      diffCalendarDays(eventDate, today),
    );

    if (daysSinceEnd === 0) {
      return {
        state: "finished",
        calendarDaysUntilStart,
        daysSinceEnd: 0,
        shortLabel: "FINALIZADO",
        fullLabel: "Finalizado",
        isFinished: true,
        isInProgress: false,
        isUpcoming: false,
      };
    }

    return {
      state: "finished_ago",
      calendarDaysUntilStart,
      daysSinceEnd,
      shortLabel: `FINALIZADO HACE ${daysSinceEnd} DÍA${daysSinceEnd === 1 ? "" : "S"}`,
      fullLabel: `Finalizado hace ${daysSinceEnd} día${daysSinceEnd === 1 ? "" : "s"}`,
      isFinished: true,
      isInProgress: false,
      isUpcoming: false,
    };
  }

  if (nowMs >= startAt.getTime()) {
    return {
      state: "in_progress",
      calendarDaysUntilStart: 0,
      daysSinceEnd: 0,
      shortLabel: "EN CURSO",
      fullLabel: "En curso",
      isFinished: false,
      isInProgress: true,
      isUpcoming: false,
    };
  }

  if (calendarDaysUntilStart === 0) {
    return {
      state: "today_before_start",
      calendarDaysUntilStart: 0,
      daysSinceEnd: 0,
      shortLabel: "HOY",
      fullLabel: "Es hoy",
      isFinished: false,
      isInProgress: false,
      isUpcoming: true,
    };
  }

  if (calendarDaysUntilStart === 1) {
    return {
      state: "upcoming_one",
      calendarDaysUntilStart: 1,
      daysSinceEnd: 0,
      shortLabel: "MAÑANA",
      fullLabel: "Falta 1 día",
      isFinished: false,
      isInProgress: false,
      isUpcoming: true,
    };
  }

  return {
    state: "upcoming_many",
    calendarDaysUntilStart,
    daysSinceEnd: 0,
    shortLabel: `FALTAN ${calendarDaysUntilStart} DÍAS`,
    fullLabel: `Faltan ${calendarDaysUntilStart} días`,
    isFinished: false,
    isInProgress: false,
    isUpcoming: true,
  };
}

export function compareEventsBySchedule(a: EventScheduleSortable, b: EventScheduleSortable): number {
  const dateCmp = a.event_date.localeCompare(b.event_date);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  const timeA = a.start_time ?? "99:99:99";
  const timeB = b.start_time ?? "99:99:99";
  const timeCmp = timeA.localeCompare(timeB);
  if (timeCmp !== 0) {
    return timeCmp;
  }

  return a.name.localeCompare(b.name, "es");
}

export type EventScheduleSortable = {
  name: string;
  event_date: string;
  start_time: string | null;
};
