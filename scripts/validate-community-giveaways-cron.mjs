/**
 * Pruebas unitarias de autenticación del cron de sorteos.
 */
import { timingSafeEqual } from "node:crypto";

function isValidCronSecret(configured, provided) {
  if (!configured || !provided) return false;
  const expected = Buffer.from(configured, "utf8");
  const actual = Buffer.from(provided, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

const SECRET = "test-cron-secret-value";

const cases = [
  { name: "sin header", configured: SECRET, provided: null, expected: false },
  { name: "header incorrecto", configured: SECRET, provided: "wrong-secret", expected: false },
  { name: "longitud diferente", configured: SECRET, provided: SECRET + "x", expected: false },
  { name: "header correcto", configured: SECRET, provided: SECRET, expected: true },
  { name: "secreto no configurado", configured: undefined, provided: SECRET, expected: false },
];

let failed = 0;

for (const testCase of cases) {
  const result = isValidCronSecret(testCase.configured, testCase.provided);
  if (result !== testCase.expected) {
    console.error(`✗ ${testCase.name}: esperado ${testCase.expected}, obtuvo ${result}`);
    failed += 1;
  } else {
    console.log(`✓ ${testCase.name}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
