const RPC_ERROR_MESSAGES: Record<string, string> = {
  "not authenticated": "Iniciá sesión para continuar.",
  "invitation not available": "Esta invitación no está disponible.",
  "invitation expired": "Esta invitación venció.",
  "invitation already used": "Esta invitación ya fue utilizada.",
  "invitation not for this account": "Esta invitación no corresponde a tu cuenta.",
  "account not enabled": "Tu cuenta no está habilitada.",
};

export function mapInvitationRpcError(message: string | undefined): string {
  if (!message) {
    return "No pudimos procesar la invitación. Intentá de nuevo.";
  }

  const normalized = message.toLowerCase();
  for (const [needle, userMessage] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (normalized.includes(needle)) {
      return userMessage;
    }
  }

  return "No pudimos procesar la invitación. Intentá de nuevo.";
}

export type InvitationPreviewState =
  | "login_required"
  | "ready"
  | "expired"
  | "unavailable"
  | "wrong_account"
  | "disabled"
  | "already_used";

export type InvitationPreview = {
  state: InvitationPreviewState;
  event?: {
    name: string;
    slug: string;
    event_date: string;
  };
  expiresAt?: string;
};

export const INVITATION_PREVIEW_MESSAGES: Record<
  Exclude<InvitationPreviewState, "ready" | "login_required">,
  string
> = {
  expired: "Esta invitación venció.",
  unavailable: "Esta invitación no está disponible.",
  wrong_account: "Esta invitación no corresponde a tu cuenta.",
  disabled: "Tu cuenta no está habilitada.",
  already_used: "Esta invitación ya fue utilizada.",
};
