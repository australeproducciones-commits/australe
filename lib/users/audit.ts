import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type AuditLogInput = {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  event_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditAction(input: AuditLogInput): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      event_id: input.event_id ?? null,
      details: (input.metadata ?? null) as Json,
    });

    if (error) {
      console.error("logAuditAction:", error);
    }
  } catch (error) {
    console.error("logAuditAction:", error);
  }
}

export const AUDIT_ACTIONS = {
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_ACTIVATED: "user.activated",
  USER_DEACTIVATED: "user.deactivated",
  EVENT_ASSIGNED: "event_staff.assigned",
  EVENT_UNASSIGNED: "event_staff.unassigned",
  PASSWORD_RESET_SENT: "user.password_reset_sent",
} as const;
