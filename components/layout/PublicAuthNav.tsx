"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";

export function PublicAuthNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      <>
        <Link
          href={ROUTES.miCuenta}
          className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
        >
          Mi cuenta
        </Link>
        <LogoutButton variant="header" />
      </>
    );
  }

  return (
    <>
      <Link
        href={ROUTES.eventos}
        className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
      >
        Eventos
      </Link>
      <Link
        href={ROUTES.comunidad}
        className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
      >
        Comunidad
      </Link>
      <Link
        href={ROUTES.login}
        className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
      >
        Ingresar
      </Link>
    </>
  );
}
