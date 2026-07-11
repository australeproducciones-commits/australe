#!/usr/bin/env node
/**
 * Validación estructural del flujo de duplicación de productos de tienda.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function mustInclude(file, needle, label) {
  const content = readFileSync(join(root, file), "utf8");
  if (!content.includes(needle)) {
    errors.push(`${label}: falta "${needle}" en ${file}`);
  }
}

const requiredFiles = [
  "lib/store/duplicate.ts",
  "components/store/admin/AdminStoreProductDuplicateVariantsPanel.tsx",
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    errors.push(`Falta archivo: ${file}`);
  }
}

mustInclude(
  "lib/store/actions.ts",
  "createStoreProductWithVariantsAction",
  "server action duplicado",
);
mustInclude(
  "lib/store/actions.ts",
  "resolveUniqueStoreProductSlug",
  "slug único",
);
mustInclude(
  "components/store/admin/AdminStoreProductTable.tsx",
  "Duplicar y editar",
  "botón tabla",
);
mustInclude(
  "components/store/admin/AdminStoreProductHubForm.tsx",
  "duplicateContext",
  "formulario duplicación",
);
mustInclude(
  "app/admin/tienda/productos/page.tsx",
  "duplicate",
  "query param duplicate",
);
mustInclude(
  "lib/constants/routes.ts",
  "adminTiendaProductosDuplicate",
  "ruta duplicate",
);
mustInclude("lib/store/duplicate.ts", "Copia de ", "prefijo nombre");

const hub = readFileSync(
  join(root, "components/store/admin/AdminStoreProductHubForm.tsx"),
  "utf8",
);
if (!hub.includes("createStoreProductWithVariantsAction")) {
  errors.push("El hub no usa createStoreProductWithVariantsAction.");
}
if (hub.includes("upsertStoreProductAction(productId, input)") && !hub.includes("isDuplicateMode")) {
  errors.push("El hub no distingue modo duplicación.");
}

if (errors.length > 0) {
  console.error("validate-store-duplicate-product: falló\n");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("validate-store-duplicate-product: OK");
