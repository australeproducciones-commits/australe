/**
 * Espera activa hasta que el servidor HTTP responda en una ruta de salud.
 */
export function resolveValidateBaseUrl() {
  const fromEnv = process.env.VALIDATE_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  const port = process.env.PORT ?? process.env.VALIDATE_PORT ?? "3001";
  return `http://localhost:${port}`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForServer(
  baseUrl = resolveValidateBaseUrl(),
  {
    timeoutMs = 120_000,
    path = "/login",
    intervalMs = 2_000,
  } = {},
) {
  const target = `${baseUrl}${path}`;
  const deadline = Date.now() + timeoutMs;
  let lastError = "sin respuesta";

  while (Date.now() < deadline) {
    try {
      const res = await fetch(target, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status > 0 && res.status < 500) {
        return { baseUrl, status: res.status };
      }
      lastError = `status ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(intervalMs);
  }

  throw new Error(`Servidor no disponible en ${target} (${lastError})`);
}
