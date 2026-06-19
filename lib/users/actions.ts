"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/users/audit";
import { countActiveAdmins } from "@/lib/users/queries";
import type {
  InternalUserFormInput,
  UserActionResult,
} from "@/lib/users/types";
import {
  eventStaffRoleFromProfileRole,
  isInternalRole,
} from "@/lib/users/types";

function validateInternalUserInput(
  input: InternalUserFormInput,
): string | null {
  if (!input.full_name.trim()) {
    return "El nombre y apellido son obligatorios.";
  }

  if (!input.email.trim()) {
    return "El correo es obligatorio.";
  }

  if (!isInternalRole(input.role)) {
    return "Rol inválido.";
  }

  if (
    input.role !== ROLES.ADMIN &&
    !input.staff_all_events &&
    input.event_ids.length === 0
  ) {
    return "Seleccioná al menos un evento o habilitá acceso a todos los eventos.";
  }

  return null;
}

/** Admin: true (acceso global por rol). Cajero/portero: solo true si el admin lo eligió explícitamente. */
function resolveStaffAllEvents(
  role: InternalUserFormInput["role"],
  requested: boolean,
): boolean {
  if (role === ROLES.ADMIN) {
    return true;
  }

  return requested === true;
}

async function syncEventStaffAssignments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  userId: string,
  role: InternalUserFormInput["role"],
  staffAllEvents: boolean,
  eventIds: string[],
) {
  const staffRole = eventStaffRoleFromProfileRole(role);

  await supabase.from("event_staff").delete().eq("user_id", userId);

  if (!staffRole || staffAllEvents || role === ROLES.ADMIN) {
    return;
  }

  const uniqueIds = [...new Set(eventIds)];

  if (uniqueIds.length === 0) {
    return;
  }

  const rows = uniqueIds.map((eventId) => ({
    event_id: eventId,
    user_id: userId,
    role: staffRole,
    is_active: true,
    assigned_by: actorId,
  }));

  const { error } = await supabase.from("event_staff").insert(rows);

  if (error) {
    throw new Error("No se pudieron guardar las asignaciones de eventos.");
  }
}

export async function createInternalUserAction(
  input: InternalUserFormInput,
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const validationError = validateInternalUserInput(input);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  try {
    const admin = createAdminClient();
    const tempPassword = generateTemporaryPassword();

    const { data, error } = await admin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name.trim(),
        whatsapp: input.whatsapp.trim() || null,
      },
    });

    if (error || !data.user) {
      if (error?.message.toLowerCase().includes("already")) {
        return { ok: false, message: "Ya existe un usuario con ese correo." };
      }
      return {
        ok: false,
        message: error?.message ?? "No se pudo crear el usuario.",
      };
    }

    const userId = data.user.id;
    const staffAllEvents = resolveStaffAllEvents(
      input.role,
      input.staff_all_events,
    );

    const { error: profileError } = await auth.supabase.from("profiles").upsert({
      id: userId,
      full_name: input.full_name.trim(),
      whatsapp: input.whatsapp.trim() || null,
      role: input.role,
      is_active: input.is_active,
      staff_all_events: staffAllEvents,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("createInternalUserAction profile:", profileError);
      return { ok: false, message: "No se pudo configurar el perfil del usuario." };
    }

    await syncEventStaffAssignments(
      auth.supabase,
      auth.profile.id,
      userId,
      input.role,
      staffAllEvents,
      input.event_ids,
    );

    await admin.auth.admin.generateLink({
      type: "recovery",
      email: input.email.trim().toLowerCase(),
    });

    await logAuditAction({
      action: AUDIT_ACTIONS.USER_CREATED,
      entity_type: "profile",
      entity_id: userId,
      metadata: {
        role: input.role,
        email: input.email.trim().toLowerCase(),
        staff_all_events: staffAllEvents,
        event_ids: input.event_ids,
      },
    });

    revalidatePath(ROUTES.adminUsuarios);

    return { ok: true, userId };
  } catch (error) {
    console.error("createInternalUserAction:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear el usuario interno.",
    };
  }
}

export async function updateInternalUserAction(
  userId: string,
  input: InternalUserFormInput,
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const validationError = validateInternalUserInput(input);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    return { ok: false, message: "Usuario no encontrado." };
  }

  if (userId === auth.profile.id && input.role !== ROLES.ADMIN) {
    return {
      ok: false,
      message: "No podés quitarte el rol de administrador a vos mismo.",
    };
  }

  if (userId === auth.profile.id && !input.is_active) {
    return {
      ok: false,
      message: "No podés desactivar tu propia cuenta.",
    };
  }

  if (
    existing.role === ROLES.ADMIN &&
    existing.is_active &&
    (!input.is_active || input.role !== ROLES.ADMIN)
  ) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      return {
        ok: false,
        message: "No podés desactivar o cambiar el rol del último administrador activo.",
      };
    }
  }

  const staffAllEvents = resolveStaffAllEvents(
    input.role,
    input.staff_all_events,
  );

  const { error: updateError } = await auth.supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      whatsapp: input.whatsapp.trim() || null,
      role: input.role,
      is_active: input.is_active,
      staff_all_events: staffAllEvents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("updateInternalUserAction:", updateError);
    return { ok: false, message: "No se pudo actualizar el usuario." };
  }

  await syncEventStaffAssignments(
    auth.supabase,
    auth.profile.id,
    userId,
    input.role,
    staffAllEvents,
    input.event_ids,
  );

  if (existing.role !== input.role) {
    await logAuditAction({
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      entity_type: "profile",
      entity_id: userId,
      metadata: { from: existing.role, to: input.role },
    });
  }

  await logAuditAction({
    action: AUDIT_ACTIONS.USER_UPDATED,
    entity_type: "profile",
    entity_id: userId,
    metadata: {
      role: input.role,
      is_active: input.is_active,
      staff_all_events: staffAllEvents,
      event_ids: input.event_ids,
    },
  });

  revalidatePath(ROUTES.adminUsuarios);
  revalidatePath(`${ROUTES.adminUsuarios}/${userId}`);

  return { ok: true, userId };
}

export async function toggleInternalUserActiveAction(
  userId: string,
  nextActive: boolean,
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  if (userId === auth.profile.id && !nextActive) {
    return { ok: false, message: "No podés desactivar tu propia cuenta." };
  }

  const { data: existing } = await auth.supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, message: "Usuario no encontrado." };
  }

  if (existing.role === ROLES.ADMIN && existing.is_active && !nextActive) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      return {
        ok: false,
        message: "No podés desactivar al último administrador activo.",
      };
    }
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: "No se pudo actualizar el estado del usuario." };
  }

  await logAuditAction({
    action: nextActive
      ? AUDIT_ACTIONS.USER_ACTIVATED
      : AUDIT_ACTIONS.USER_DEACTIVATED,
    entity_type: "profile",
    entity_id: userId,
  });

  revalidatePath(ROUTES.adminUsuarios);

  return { ok: true, userId };
}

export async function sendInternalUserPasswordResetAction(
  email: string,
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  if (!email.trim()) {
    return { ok: false, message: "Correo inválido." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
    });

    if (error) {
      return { ok: false, message: "No se pudo enviar el enlace de recuperación." };
    }

    await logAuditAction({
      action: AUDIT_ACTIONS.PASSWORD_RESET_SENT,
      entity_type: "profile",
      metadata: { email: email.trim().toLowerCase() },
    });

    return { ok: true };
  } catch (error) {
    console.error("sendInternalUserPasswordResetAction:", error);
    return { ok: false, message: "No se pudo generar el acceso de recuperación." };
  }
}

function generateTemporaryPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "Au1!";
  for (let index = 0; index < 12; index += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
