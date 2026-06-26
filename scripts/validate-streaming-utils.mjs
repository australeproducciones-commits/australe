/**
 * Validación local de utilidades de streaming (Etapa 1).
 * Ejecutar: node scripts/validate-streaming-utils.mjs
 */

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

function extractYoutubeVideoId(url) {
  const match = url.trim().match(YOUTUBE_ID_RE);
  return match?.[1] ?? null;
}

const VIMEO_ID_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

function extractVimeoVideoId(url) {
  const match = url.trim().match(VIMEO_ID_RE);
  return match?.[1] ?? null;
}

function resolveYoutubeEmbed(url) {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function resolveVimeoEmbed(url) {
  const id = extractVimeoVideoId(url);
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

const cases = [
  {
    name: "YouTube watch",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    youtube: "dQw4w9WgXcQ",
  },
  {
    name: "YouTube short",
    url: "https://youtu.be/dQw4w9WgXcQ",
    youtube: "dQw4w9WgXcQ",
  },
  {
    name: "YouTube live",
    url: "https://www.youtube.com/live/dQw4w9WgXcQ",
    youtube: "dQw4w9WgXcQ",
  },
  {
    name: "Vimeo",
    url: "https://vimeo.com/123456789",
    vimeo: "123456789",
  },
  {
    name: "javascript blocked",
    url: "javascript:alert(1)",
    blocked: true,
  },
  {
    name: "data URI blocked",
    url: "data:text/html,<script>alert(1)</script>",
    blocked: true,
  },
  {
    name: "invalid YouTube",
    url: "https://www.youtube.com/watch?v=short",
    invalid: true,
  },
];

let passed = 0;
let failed = 0;

for (const test of cases) {
  if (test.blocked) {
    if (isUnsafeUrl(test.url)) {
      console.log(`✓ ${test.name}`);
      passed++;
    } else {
      console.error(`✗ ${test.name}`);
      failed++;
    }
    continue;
  }

  if (test.invalid) {
    const yt = extractYoutubeVideoId(test.url);
    if (yt === null) {
      console.log(`✓ ${test.name}`);
      passed++;
    } else {
      console.error(`✗ ${test.name}`, { yt });
      failed++;
    }
    continue;
  }

  const yt = extractYoutubeVideoId(test.url);
  const vm = extractVimeoVideoId(test.url);
  const ok =
    (test.youtube && yt === test.youtube && resolveYoutubeEmbed(test.url)?.includes(test.youtube)) ||
    (test.vimeo && vm === test.vimeo && resolveVimeoEmbed(test.url)?.includes(test.vimeo));

  if (ok) {
    console.log(`✓ ${test.name}`);
    passed++;
  } else {
    console.error(`✗ ${test.name}`, { yt, vm });
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
