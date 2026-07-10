"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptCommunityInvitationAction } from "@/lib/community/invitations/actions";
import { PublicButton } from "@/components/ui/public/PublicButton";

type InvitationAcceptFormProps = {
  token: string;
};

export function InvitationAcceptForm({ token }: InvitationAcceptFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptCommunityInvitationAction(token);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      <PublicButton
        type="button"
        variant="primary"
        className="w-full"
        disabled={isPending}
        onClick={handleAccept}
      >
        {isPending ? "Procesando..." : "Aceptar invitación"}
      </PublicButton>
    </div>
  );
}
