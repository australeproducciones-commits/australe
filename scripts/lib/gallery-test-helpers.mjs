/** Helpers compartidos para scripts J1 (timing Mendoza + parsers de video). */

export const MENDOZA_OFFSET = "-03:00";
export const EVENT_TIMEZONE = "America/Argentina/Mendoza";

export function ymdInMendoza(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function mendozaInstant(eventDate, time, mode) {
  const fallback = mode === "start" ? "00:00:00" : "23:59:59";
  const normalized =
    time && time.length >= 5
      ? time.length === 5
        ? `${time}:00`
        : time
      : fallback;
  return new Date(`${eventDate}T${normalized}${MENDOZA_OFFSET}`);
}

export function isEventFinished(event, now = new Date()) {
  if (!event.event_date) return false;
  const endDate = event.event_end_date ?? event.event_date;
  const startAt = mendozaInstant(event.event_date, event.start_time, "start");
  let endAt;
  if (event.end_time) {
    endAt = mendozaInstant(endDate, event.end_time, "end");
    if (endAt.getTime() <= startAt.getTime()) {
      endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
    }
  } else if (event.event_end_date && event.event_end_date !== event.event_date) {
    endAt = mendozaInstant(event.event_end_date, null, "end");
  } else if (event.start_time) {
    endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);
  } else {
    endAt = mendozaInstant(endDate, null, "end");
  }
  return now.getTime() >= endAt.getTime();
}

export function filterCartelera(events, now = new Date()) {
  return events.filter(
    (e) =>
      (e.content_kind ?? "event") === "event" &&
      e.event_date &&
      !isEventFinished(e, now),
  );
}

export function filterGalleries(events, now = new Date()) {
  return events.filter(
    (e) =>
      (e.content_kind ?? "event") === "event" &&
      e.status === "published" &&
      e.audience === "public" &&
      e.event_date &&
      isEventFinished(e, now),
  );
}

export function filterFeatured(events, now = new Date()) {
  return events.filter((e) => {
    if (!e.is_featured) return false;
    if (e.featured_until && new Date(e.featured_until) < now) return false;
    if ((e.content_kind ?? "event") === "promotion") return true;
    return (e.content_kind ?? "event") === "event" && Boolean(e.event_date);
  });
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

function parseYoutubeId(input) {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") return url.pathname.replace(/^\//, "").split("/")[0] || null;
    if (YOUTUBE_HOSTS.has(host)) return url.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function parseVimeoId(input) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!VIMEO_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.pathname.split("/").find((p) => /^\d+$/.test(p)) ?? null;
  } catch {
    return null;
  }
}

export function parseGalleryVideo(mediaType, rawInput) {
  if (mediaType === "youtube") {
    const id = parseYoutubeId(rawInput);
    return id ? { mediaType, mediaUrl: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (mediaType === "vimeo") {
    const id = parseVimeoId(rawInput);
    return id ? { mediaType, mediaUrl: `https://vimeo.com/${id}` } : null;
  }
  return null;
}

export function pastDate(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function futureDate(daysAhead) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}
