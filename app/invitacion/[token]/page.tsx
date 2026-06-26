import type { Metadata } from "next";
import { InvitationAcceptForm } from "@/components/community/invitations/InvitationAcceptForm";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import { buildLoginUrl } from "@/lib/auth/loginRedirect";
import {
  INVITATION_PREVIEW_MESSAGES,
  type InvitationPreview,
} from "@/lib/community/invitations/errors";
import {
  getInvitationAcceptPreview,
  recordInvitationOpen,
} from "@/lib/community/invitations/queries";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEventDate(eventDate: string): string {
  return new Date(eventDate).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMessage(preview: InvitationPreview) {
  if (preview.state === "login_required") {
    return null;
  }

  if (preview.state === "ready") {
    return null;
  }

  return (
    <p className="text-sm text-[var(--public-muted)]">
      {INVITATION_PREVIEW_MESSAGES[preview.state]}
    </p>
  );
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const trimmedToken = token.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!trimmedToken) {
    return (
      <InvitationShell>
        <p className="text-sm text-[var(--public-muted)]">
          Esta invitación no está disponible.
        </p>
      </InvitationShell>
    );
  }

  if (!user) {
    const loginHref = buildLoginUrl(ROUTES.invitacion(trimmedToken));
    return (
      <InvitationShell>
        <p className="text-sm text-[var(--public-muted)]">
          Iniciá sesión con la cuenta destinataria para revisar y aceptar esta
          invitación.
        </p>
        <PublicButton href={loginHref} variant="primary" className="w-full">
          Iniciar sesión para aceptar
        </PublicButton>
      </InvitationShell>
    );
  }

  const preview = await getInvitationAcceptPreview(trimmedToken, user.id, supabase);

  if (preview.state === "ready") {
    await recordInvitationOpen(trimmedToken, supabase);
  }

  return (
    <InvitationShell>
      {preview.state === "ready" && preview.event ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">{preview.event.name}</h2>
            <p className="text-sm text-[var(--public-muted)]">
              {formatEventDate(preview.event.event_date)}
            </p>
            {preview.expiresAt ? (
              <p className="text-sm text-[var(--public-muted)]">
                Vence el {formatExpiry(preview.expiresAt)}
              </p>
            ) : null}
          </div>
          <InvitationAcceptForm token={trimmedToken} />
        </div>
      ) : (
        renderMessage(preview)
      )}
    </InvitationShell>
  );
}

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
      <PublicCard padding="lg" className="space-y-6">
        <SectionHeading
          title="Invitación a evento"
          subtitle="Confirmá tu asistencia de forma segura con tu cuenta."
        />
        {children}
      </PublicCard>
    </div>
  );
}
