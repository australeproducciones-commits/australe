import type { PostgrestError } from "@supabase/supabase-js";

export const EVENTS_LOAD_ERROR_MESSAGE =
  "Revisá la conexión con Supabase o las migraciones pendientes.";

export const PUBLIC_EVENTS_LOAD_ERROR_MESSAGE =
  "No pudimos cargar la cartelera en este momento. Intentá de nuevo más tarde.";

export class SupabaseQueryError extends Error {
  readonly userMessage: string;

  constructor(
    context: string,
    error: PostgrestError | Error,
    userMessage: string,
  ) {
    super(`${context}: ${error.message}`);
    this.name = "SupabaseQueryError";
    this.userMessage = userMessage;
    console.error(context, error);
  }
}

export function isSupabaseQueryError(
  error: unknown,
): error is SupabaseQueryError {
  return error instanceof SupabaseQueryError;
}

export function throwSupabaseQueryError(
  context: string,
  error: PostgrestError,
  userMessage: string = EVENTS_LOAD_ERROR_MESSAGE,
): never {
  throw new SupabaseQueryError(context, error, userMessage);
}
