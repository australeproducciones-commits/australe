/** Utilidades de horario de evento (America/Argentina/Mendoza vía eventTiming). */

const MINUTES_PER_DAY = 24 * 60;

export function parseTimeInputToMinutes(time: string): number | null {
  const trimmed = time.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1]!, 10);
  const minutes = Number.parseInt(match[2]!, 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTimeInput(totalMinutes: number): string {
  const normalized =
    ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Duración en minutos; si fin <= inicio, asume día siguiente. */
export function computeDurationMinutes(
  startTime: string,
  endTime: string,
): number | null {
  const start = parseTimeInputToMinutes(startTime);
  const end = parseTimeInputToMinutes(endTime);

  if (start == null || end == null) {
    return null;
  }

  let endAdjusted = end;
  if (endAdjusted <= start) {
    endAdjusted += MINUTES_PER_DAY;
  }

  return endAdjusted - start;
}

export function computeEndTimeFromStartAndDuration(
  startTime: string,
  durationMinutes: number,
): string | null {
  const start = parseTimeInputToMinutes(startTime);
  if (start == null || durationMinutes < 0) {
    return null;
  }

  return minutesToTimeInput(start + durationMinutes);
}

export function splitDurationMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, Math.floor(totalMinutes));
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

export function joinDurationParts(hours: number, minutes: number): number {
  const safeHours = Math.max(0, Math.floor(hours));
  const safeMinutes = Math.max(0, Math.min(59, Math.floor(minutes)));
  return safeHours * 60 + safeMinutes;
}

export function formatDurationLabel(totalMinutes: number): string {
  const { hours, minutes } = splitDurationMinutes(totalMinutes);

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

export function formatPublicEventTimeRange(
  startTime: string | null,
  endTime: string | null,
): string | null {
  if (!startTime) {
    return null;
  }

  const start = startTime.slice(0, 5);
  if (!endTime) {
    return start;
  }

  return `${start} a ${endTime.slice(0, 5)}`;
}

export function formatPublicEventDuration(
  startTime: string | null,
  endTime: string | null,
): string | null {
  if (!startTime || !endTime) {
    return null;
  }

  const duration = computeDurationMinutes(startTime, endTime);
  if (duration == null || duration <= 0) {
    return null;
  }

  return `Duración aproximada: ${formatDurationLabel(duration)}`;
}

export function eventEndCrossesMidnight(
  startTime: string | null,
  endTime: string | null,
): boolean {
  if (!startTime || !endTime) {
    return false;
  }

  const start = parseTimeInputToMinutes(startTime);
  const end = parseTimeInputToMinutes(endTime);

  if (start == null || end == null) {
    return false;
  }

  return end <= start;
}
