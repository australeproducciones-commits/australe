/**
 * Validación local de utilidades de publicidad (sin framework de tests).
 * Ejecutar: node scripts/validate-advertising-display.mjs
 */

function formatAdvertisingCtr(views, clicks) {
  if (views <= 0) return "0 %";
  const ctr = (clicks / views) * 100;
  return `${ctr.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} %`;
}

function isValidAdvertisingDestination(value) {
  const destination = value?.trim();
  if (!destination) return false;
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
  if (destination.startsWith("//")) return false;
  try {
    const parsed = new URL(destination);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getKind(campaign, now = new Date()) {
  const nowMs = now.getTime();
  const endsMs = campaign.ends_at ? Date.parse(campaign.ends_at) : null;
  const startsMs = campaign.starts_at ? Date.parse(campaign.starts_at) : null;
  if (endsMs !== null && endsMs <= nowMs) return "finished";
  if (!campaign.is_active) return "paused";
  if (startsMs !== null && startsMs > nowMs) return "scheduled";
  if (
    campaign.is_active &&
    (!campaign.image_url?.trim() || !campaign.destination_url?.trim())
  ) {
    return "incomplete";
  }
  return "active";
}

const now = new Date("2026-06-15T12:00:00Z");
let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`OK  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

assert("CTR con vistas 0", formatAdvertisingCtr(0, 5) === "0 %");
assert("CTR normal", formatAdvertisingCtr(100, 4) === "4 %");
assert("ruta relativa válida", isValidAdvertisingDestination("/eventos/test"));
assert("URL https válida", isValidAdvertisingDestination("https://australe.com/e"));
assert("protocol-relative inválida", !isValidAdvertisingDestination("//evil.com"));
assert("javascript inválido", !isValidAdvertisingDestination("javascript:alert(1)"));
assert("data inválido", !isValidAdvertisingDestination("data:text/html,x"));

assert(
  "finalizada por fecha",
  getKind(
    {
      is_active: true,
      starts_at: "2026-01-01T00:00:00Z",
      ends_at: "2026-06-01T00:00:00Z",
      image_url: "x",
      destination_url: "/e",
    },
    now,
  ) === "finished",
);

assert(
  "pausada manual",
  getKind(
    {
      is_active: false,
      starts_at: null,
      ends_at: null,
      image_url: "x",
      destination_url: "/e",
    },
    now,
  ) === "paused",
);

assert(
  "programada",
  getKind(
    {
      is_active: true,
      starts_at: "2026-07-01T00:00:00Z",
      ends_at: null,
      image_url: "x",
      destination_url: "/e",
    },
    now,
  ) === "scheduled",
);

assert(
  "incompleta activa",
  getKind(
    {
      is_active: true,
      starts_at: null,
      ends_at: null,
      image_url: "",
      destination_url: "/e",
    },
    now,
  ) === "incomplete",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
