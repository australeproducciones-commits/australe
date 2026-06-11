"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoggedIn) {
    return (
      <div className={cn("flex items-center gap-2", stacked && "flex-col")}>
        <Link href={ROUTES.miCuenta} className={linkClass}>
          Mi cuenta
        </Link>
        <LogoutButton variant="header" />
      </div>
    );
  }

  return (
    <Link href={ROUTES.login} className={linkClass}>
      Ingresar
    </Link>
  );
}
