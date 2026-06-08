import { getProfile } from "@/lib/auth/getProfile";
import { getRedirectPathForRole } from "@/lib/auth/redirectByRole";
import { createClient } from "@/lib/supabase/client";

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "Credenciales incorrectas. Revisá email y contraseña.";
  }

  if (lower.includes("email not confirmed")) {
    return "Revisá tu email para confirmar tu cuenta antes de ingresar.";
  }

  if (lower.includes("user already registered")) {
    return "Ya existe una cuenta con ese email.";
  }

  if (lower.includes("password")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }

  return message;
}

export async function ensureUserProfile(
  fullName?: string | null,
  whatsapp?: string | null,
) {
  const supabase = createClient();

  const { error } = await supabase.rpc("ensure_profile", {
    p_full_name: fullName ?? null,
    p_whatsapp: whatsapp ?? null,
  });

  if (error) {
    throw new Error("Error al crear el perfil. Intentá de nuevo.");
  }
}

export async function completeAuthFlow(
  fullName?: string | null,
  whatsapp?: string | null,
): Promise<string> {
  await ensureUserProfile(fullName, whatsapp);

  const supabase = createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    throw new Error("Error al cargar el perfil. Intentá de nuevo.");
  }

  return getRedirectPathForRole(profile.role);
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  whatsapp: string,
) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        whatsapp,
      },
    },
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("No se pudo cerrar sesión. Intentá de nuevo.");
  }
}
