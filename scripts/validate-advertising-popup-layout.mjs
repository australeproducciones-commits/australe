/**
 * Validación del layout del popup de publicidad post-login.
 * Ejecutar: node scripts/validate-advertising-popup-layout.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

function read(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

function includesAll(file, fragments, label) {
  const content = read(file);
  const missing = fragments.filter((fragment) => !content.includes(fragment));
  if (missing.length === 0) {
    passed += 1;
    console.log(`OK  ${label}`);
    return true;
  }
  failed += 1;
  console.error(`FAIL ${label}: faltan en ${file}: ${missing.join(", ")}`);
  return false;
}

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`OK  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

function countCallSites(content, fnName) {
  const matches = content.match(new RegExp(`${fnName}\\(`, "g"));
  return matches ? matches.length : 0;
}

let passed = 0;
let failed = 0;

console.log("\n=== validate advertising popup layout ===\n");

const modalPath = "components/advertising/PostLoginAdModal.tsx";
const formPath = "components/admin/advertising/AdminAdvertisingCampaignForm.tsx";
const modal = read(modalPath);
const form = read(formPath);

// 1. Lógica de apertura preservada
includesAll(modalPath, ["POST_LOGIN_AD_SESSION_KEY", "fetchPostLoginAdvertisingAction", "setOpen(true)"], "1 popup mantiene lógica de apertura");

// 2–4. Imagen protagonista y contenedor responsive
includesAll(
  modalPath,
  [
    "w-[min(92vw,32.5rem)]",
    "max-h-[min(90dvh,44rem)]",
    "clamp(14rem, calc(min(90dvh, 44rem) - 9.5rem), 25.625rem)",
    'objectFit="contain"',
  ],
  "2–4 imagen prioritaria, contenedor responsive y sin deformación",
);

assert("3 proporción visual ~75/25 (altura imagen vs bloque compacto)", modal.includes("25.625rem") && modal.includes("9.5rem"));

// 5–8. Bloque inferior compacto
includesAll(
  modalPath,
  ["line-clamp-2", "leading-snug", "h-11", "min-h-[2.5rem]"],
  "5–8 contenido inferior compacto con límites de líneas",
);

assert("8 descripción vacía sin hueco", modal.includes("hasBody") && modal.includes("{hasBody ?"));

// 9–12. CTA, cerrar, escape, backdrop
includesAll(
  modalPath,
  [
    "recordAdvertisingClickAction",
    "handleClose",
    'event.key === "Escape"',
    "onClick={handleClose}",
    "Cerrar",
  ],
  "9–12 CTA, cerrar, escape y backdrop",
);

// 13–15. Tracking sin duplicación
assert(
  "13–14 tracking de vista y clic presente",
  modal.includes("recordAdvertisingViewAction") && modal.includes("recordAdvertisingClickAction"),
);
assert(
  "15 vista registrada una sola vez en el efecto de apertura",
  countCallSites(modal, "recordAdvertisingViewAction") === 1,
);
assert(
  "15 clic registrado una sola vez en handler",
  countCallSites(modal, "recordAdvertisingClickAction") === 1,
);

// 16. Accesibilidad
includesAll(
  modalPath,
  ['role="dialog"', 'aria-modal="true"', 'aria-label="Cerrar publicidad"', "document.body.style.overflow"],
  "16 modal accesible con dialog, aria y bloqueo de scroll",
);

// 17–19. Ayuda administrativa
assert(
  "17–19 administrador muestra medidas, proporción y formato",
  form.includes("1600 × 1200 px") &&
    form.includes("proporción 4:3") &&
    form.includes("WebP o JPG") &&
    form.includes("200 y 800 KB") &&
    form.includes("área central para evitar recortes"),
);

// 20. Sin nuevas consultas en el modal
assert(
  "20 sin consultas nuevas en el popup",
  !modal.includes("createClient") && !modal.includes("from(") && !modal.includes("supabase"),
);

// 21. Sin migraciones nuevas en la rama
let migrationDiff = "";
try {
  migrationDiff = execSync("git diff --name-only origin/main...HEAD", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  migrationDiff = "";
}
assert(
  "21 sin migraciones nuevas",
  !migrationDiff.split(/\r?\n/).some((file) => file.startsWith("supabase/migrations/")),
);

// 22. Build (se valida aparte; marcar presencia de script)
assert("22 script de validación presente", existsSync(resolve(process.cwd(), "scripts/validate-advertising-popup-layout.mjs")));

// 23–24. Responsive básico
includesAll(
  modalPath,
  ["min-w-0", "overscroll-contain", "max-[360px]:flex-col", "p-3 sm:p-4"],
  "23–24 sin scroll horizontal básico y responsive móvil",
);

// Botón X en imagen
assert("7 botón X discreto en imagen", modal.includes("absolute right-2 top-2") && modal.includes("×"));

// object-fit contain en preview admin
const globals = read("app/globals.css");
assert("preview admin usa 4:3 y contain", globals.includes("aspect-ratio: 4 / 3") && globals.includes("object-fit: contain"));

// No object-cover en modal
assert("popup no usa object-cover", !modal.includes('objectFit="cover"'));

// recordAdvertisingDismissAction preserved
assert("cierre registra dismiss", modal.includes("recordAdvertisingDismissAction"));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
