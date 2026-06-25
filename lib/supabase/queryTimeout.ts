export class QueryTimeoutError extends Error {
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Query timeout: ${operation} (${timeoutMs}ms)`);
    this.name = "QueryTimeoutError";
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

type QueryRunner<TResult> = (signal: AbortSignal) => PromiseLike<TResult>;

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) {
    return true;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error && /abort/i.test(error.message)) {
    return true;
  }

  return false;
}

/** Ejecuta una consulta Supabase con cancelación real vía AbortSignal.timeout. */
export async function withQueryTimeout<TResult>(
  operation: string,
  run: QueryRunner<TResult>,
  timeoutMs = 8_000,
): Promise<TResult> {
  const signal = AbortSignal.timeout(timeoutMs);

  try {
    return await run(signal);
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw new QueryTimeoutError(operation, timeoutMs);
    }

    throw error;
  }
}

export function logSlowQuery(
  operation: string,
  durationMs: number,
  requestId?: string | null,
) {
  if (durationMs < 2_000) {
    return;
  }

  console.warn(
    `[slow-query] op=${operation} durationMs=${durationMs}${
      requestId ? ` requestId=${requestId}` : ""
    }`,
  );
}
