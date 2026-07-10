/**
 * Validación de utilidades de streaming (URLs y reproductores).
 * Ejecutar: node scripts/validate-streaming-utils.mjs
 */

const STREAM_PROVIDER = {
  YOUTUBE: "youtube",
  VIMEO: "vimeo",
  HLS: "hls",
  OTHER: "other",
};

function isUnsafeUrl(value) {
  const lower = value.trim().toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("//")
  );
}

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_ID_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

function extractYoutubeVideoId(url) {
  const match = url.trim().match(YOUTUBE_ID_RE);
  return match?.[1] ?? null;
}

function extractVimeoVideoId(url) {
  const match = url.trim().match(VIMEO_ID_RE);
  return match?.[1] ?? null;
}

function parseStreamUrl(value) {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function hasEmbeddedCredentials(parsed) {
  return Boolean(parsed.username || parsed.password);
}

function isAllowedHttpsPort(port) {
  return !port || port === "443";
}

function isPrivateOrReservedHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::1") return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1).map((part) => Number(part));
    if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = octets;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
}

function isValidHttpsStreamUrl(url) {
  const parsed = parseStreamUrl(url);
  if (!parsed || parsed.protocol !== "https:") return false;
  if (hasEmbeddedCredentials(parsed)) return false;
  if (!isAllowedHttpsPort(parsed.port)) return false;
  if (isPrivateOrReservedHost(parsed.hostname)) return false;
  return true;
}

function isValidOtherStreamUrl(url) {
  return isValidHttpsStreamUrl(url);
}

function isValidStreamUrl(url, provider) {
  const trimmed = url?.trim();
  if (!trimmed || isUnsafeUrl(trimmed)) return false;
  switch (provider) {
    case STREAM_PROVIDER.YOUTUBE:
      return extractYoutubeVideoId(trimmed) !== null;
    case STREAM_PROVIDER.VIMEO:
      return extractVimeoVideoId(trimmed) !== null;
    case STREAM_PROVIDER.HLS:
      return isValidHttpsStreamUrl(trimmed) && trimmed.toLowerCase().includes(".m3u8");
    case STREAM_PROVIDER.OTHER:
      return isValidOtherStreamUrl(trimmed);
    default:
      return false;
  }
}

function resolveStreamEmbed(streamUrl, provider, title = "Transmisión en vivo") {
  const url = streamUrl?.trim();
  if (!url || isUnsafeUrl(url)) {
    return { kind: "unsupported", message: "URL de transmisión no válida." };
  }
  if (provider === STREAM_PROVIDER.YOUTUBE) {
    const id = extractYoutubeVideoId(url);
    if (!id) return { kind: "unsupported", message: "YouTube inválido" };
    return { kind: "iframe", src: `https://www.youtube.com/embed/${id}`, title };
  }
  if (provider === STREAM_PROVIDER.VIMEO) {
    const id = extractVimeoVideoId(url);
    if (!id) return { kind: "unsupported", message: "Vimeo inválido" };
    return { kind: "iframe", src: `https://player.vimeo.com/video/${id}`, title };
  }
  if (provider === STREAM_PROVIDER.HLS) {
    if (!isValidHttpsStreamUrl(url) || !url.toLowerCase().includes(".m3u8")) {
      return { kind: "unsupported", message: "HLS inválido" };
    }
    return { kind: "hls", src: url, title };
  }
  if (provider === STREAM_PROVIDER.OTHER) {
    if (!isValidOtherStreamUrl(url)) {
      return { kind: "unsupported", message: "Otro inválido" };
    }
    return { kind: "external_link", href: url, label: title || "Ver transmisión" };
  }
  return { kind: "unsupported", message: "Proveedor no soportado" };
}

let passed = 0;
let failed = 0;

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function bad(name, detail = "") {
  failed++;
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function assert(name, condition, detail = "") {
  if (condition) ok(name, detail);
  else bad(name, detail);
}

const OTHER_HTTPS = "https://stream.example.com/live";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const VIMEO_URL = "https://vimeo.com/123456789";
const HLS_HTTPS = "https://cdn.example.com/live/stream.m3u8";

assert("other HTTPS válido", isValidStreamUrl(OTHER_HTTPS, STREAM_PROVIDER.OTHER));
assert(
  "other HTTP rechazado",
  !isValidStreamUrl("http://stream.example.com/live", STREAM_PROVIDER.OTHER),
);
assert(
  "other localhost rechazado",
  !isValidStreamUrl("https://localhost/live", STREAM_PROVIDER.OTHER),
);
assert(
  "other IP privada rechazada",
  !isValidStreamUrl("https://192.168.1.10/live", STREAM_PROVIDER.OTHER),
);
assert(
  "other con credenciales rechazado",
  !isValidStreamUrl("https://user:pass@stream.example.com/live", STREAM_PROVIDER.OTHER),
);

const otherEmbed = resolveStreamEmbed(OTHER_HTTPS, STREAM_PROVIDER.OTHER, "Ver transmisión");
assert(
  "other renderizado como enlace",
  otherEmbed.kind === "external_link" && otherEmbed.href === OTHER_HTTPS,
);
assert(
  "other no genera iframe",
  otherEmbed.kind !== "iframe",
);

const ytEmbed = resolveStreamEmbed(YOUTUBE_URL, STREAM_PROVIDER.YOUTUBE);
assert(
  "YouTube genera iframe",
  ytEmbed.kind === "iframe" && ytEmbed.src.includes("youtube.com/embed/"),
);

const vmEmbed = resolveStreamEmbed(VIMEO_URL, STREAM_PROVIDER.VIMEO);
assert(
  "Vimeo genera iframe",
  vmEmbed.kind === "iframe" && vmEmbed.src.includes("player.vimeo.com"),
);

assert(
  "HLS HTTP rechazado",
  !isValidStreamUrl("http://cdn.example.com/live/stream.m3u8", STREAM_PROVIDER.HLS),
);
assert("HLS HTTPS válido", isValidStreamUrl(HLS_HTTPS, STREAM_PROVIDER.HLS));

assert("javascript: rechazada", isUnsafeUrl("javascript:alert(1)"));
assert(
  "javascript: no embebe",
  resolveStreamEmbed("javascript:alert(1)", STREAM_PROVIDER.YOUTUBE).kind === "unsupported",
);

assert("YouTube watch ID", extractYoutubeVideoId(YOUTUBE_URL) === "dQw4w9WgXcQ");
assert("data URI bloqueada", isUnsafeUrl("data:text/html,<script>alert(1)</script>"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
