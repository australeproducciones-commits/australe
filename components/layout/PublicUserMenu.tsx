"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { PublicSessionUser } from "@/lib/auth/getPublicSessionUser";
import { getPublicNavAuthLink } from "@/lib/auth/getPublicNavAuth";
import {
  getSessionUserInitial,
  resolvePublicSessionUser,
} from "@/lib/auth/resolvePublicSessionUser";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type AuthView = "pending" | "guest" | "authenticated";

type PublicUserMenuProps = {
  stacked?: boolean;
};

export function PublicUserMenu({ stacked = false }: PublicUserMenuProps) {
  const [authView, setAuthView] = useState<AuthView>("pending");
  const [sessionUser, setSessionUser] = useState<PublicSessionUser | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function syncSession() {
      const resolved = await resolvePublicSessionUser(supabase);

      if (!active) {
        return;
      }

      setSessionUser(resolved);
      setAuthView(resolved ? "authenticated" : "guest");
    }

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const linkClass = cn(
    "relative z-10 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition pointer-events-auto",
    stacked
      ? "w-full justify-start public-heading hover:bg-[var(--public-header-hover)]"
      : "public-text-muted hover:bg-[var(--public-header-hover)] hover:public-heading",
  );

  if (authView === "pending") {
    return (
      <span
        className={cn(linkClass, "pointer-events-none select-none")}
        aria-busy="true"
        aria-label="Cargando acceso"
      >
        <span className="invisible">Ingresar</span>
      </span>
    );
  }

  if (authView !== "authenticated" || !sessionUser) {
    return (
      <Link href={ROUTES.login} className={linkClass}>
        Ingresar
      </Link>
    );
  }

  const primaryLink = getPublicNavAuthLink(sessionUser);
  const initial = getSessionUserInitial(sessionUser);

  return (
    <div
      className={cn(
        "relative z-10 flex items-center gap-1 pointer-events-auto",
        stacked && "w-full flex-col items-stretch",
      )}
    >
      <Link
        href={primaryLink.href}
        className={cn(linkClass, stacked ? "gap-3" : "gap-2")}
      >
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold public-heading"
          style={{
            backgroundColor: "var(--public-header-hover)",
            border: "1px solid var(--public-border)",
          }}
          aria-hidden
        >
          {initial}
        </span>
        <span>{primaryLink.label}</span>
      </Link>
      <LogoutButton
        variant="public-header"
        redirectTo={ROUTES.login}
        onSignedOut={() => {
          setSessionUser(null);
          setAuthView("guest");
        }}
        className={cn(stacked && "w-full justify-start")}
      />
    </div>
  );
}
