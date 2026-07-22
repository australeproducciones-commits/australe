/**
 * Pruebas de validateGiveawayImageUrl (lógica espejo de validation.ts).
 */
const BLOCKED = /^(javascript|data|file|vbscript):/i;

function validateGiveawayImageUrl(imageUrl) {
  if (imageUrl == null || imageUrl.trim() === "") return null;
  const value = imageUrl.trim();
  if (BLOCKED.test(value)) return "protocolo no permitido";
  if (value.startsWith("/")) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "protocolo inválido";
    }
    return null;
  } catch {
    return "url inválida";
  }
}

const cases = [
  { input: null, ok: true },
  { input: "", ok: true },
  { input: "https://cdn.example.com/banner.jpg", ok: true },
  { input: "http://example.com/x.png", ok: true },
  { input: "/images/giveaway.png", ok: true },
  { input: "javascript:alert(1)", ok: false },
  { input: "data:image/png;base64,abc", ok: false },
  { input: "file:///etc/passwd", ok: false },
  { input: "vbscript:msgbox(1)", ok: false },
];

let failed = 0;
for (const testCase of cases) {
  const result = validateGiveawayImageUrl(testCase.input);
  const isOk = testCase.ok ? result === null : result !== null;
  if (!isOk) {
    console.error(`✗ image_url ${JSON.stringify(testCase.input)}`);
    failed += 1;
  } else {
    console.log(`✓ image_url ${JSON.stringify(testCase.input)}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
