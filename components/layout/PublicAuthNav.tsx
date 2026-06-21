"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getPublicNavAuthLink } from "@/lib/auth/getPublicNavAuth";
import { resolvePublicSessionUser } from "@/lib/auth/resolvePublicSessionUser";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type PublicAuthNavProps = {
  surface?: "dark" | "light";
  stacked?: boolean;
};

export function PublicAuthNav({
  surface = "dark",
  stacked = false,
}: PublicAuthNavProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authHref, setAuthHref] = useState<string>(ROUTES.miCuenta);
  const [authLabel, setAuthLabel] = useState("Mi cuenta");
  const isLight = surface === "light";

  const linkClass = cn(
    "rounded-xl px-3 py-2 text-sm font-medium transition",
    isLight
      ? "text-[#6F647C] hover:bg-[#F1E8FF] hover:text-[#2F2A3A]"
      : "text-zinc-300 hover:bg-white/5 hover:text-white",
    stacked && "px-3 py-3",
  );

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function syncSession() {
      const sessionUser = await resolvePublicSessionUser(supabase);

      if (!active) {
        return;
      }

      if (!sessionUser) {
        setIsAuthenticated(false);
        return;
      }

      const link = getPublicNavAuthLink(sessionUser);
      setIsAuthenticated(true);
      setAuthHref(link.href);
      setAuthLabel(link.label);
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

  if (isAuthenticated) {
    return (
      <div className={cn("flex items-center gap-2", stacked && "flex-col")}>
        <Link href={authHref} className={linkClass}>
          {authLabel}
        </Link>
        <LogoutButton variant="header" redirectTo={ROUTES.login} />
      </div>
    );
  }

  return (
    <Link href={ROUTES.login} className={linkClass}>
      Ingresar
    </Link>
  );
}
