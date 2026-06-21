"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { PublicSessionUser } from "@/lib/auth/getPublicSessionUser";
import { getPublicNavAuthLink } from "@/lib/auth/getPublicNavAuth";
import { getEffectiveRole } from "@/lib/auth/routeAccess";
import {
  getSessionUserInitial,
  resolvePublicSessionUser,
} from "@/lib/auth/resolvePublicSessionUser";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type AuthView = "pending" | "guest" | "authenticated";

type PublicUserMenuProps = {
  stacked?: boolean;
};

const SESSION_SYNC_TIMEOUT_MS = 4000;

export function PublicUserMenu({ stacked = false }: PublicUserMenuProps) {
  const menuId = useId();
  const [authView, setAuthView] = useState<AuthView>("pending");
  const [sessionUser, setSessionUser] = useState<PublicSessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function syncSession() {
      try {
        const resolved = await resolvePublicSessionUser(supabase);

        if (!active) {
          return;
        }

        setSessionUser(resolved);
        setAuthView(resolved ? "authenticated" : "guest");
      } catch {
        if (!active) {
          return;
        }

        setSessionUser(null);
        setAuthView("guest");
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (!active) {
        return;
      }

      setAuthView((current) => (current === "pending" ? "guest" : current));
    }, SESSION_SYNC_TIMEOUT_MS);

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncSession();
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const linkClass = cn(
    "relative z-10 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition pointer-events-auto",
    stacked
      ? "w-full justify-start public-heading hover:bg-[var(--public-header-hover)]"
      : "public-text-muted hover:bg-[var(--public-header-hover)] hover:public-heading",
  );

  if (authView === "pending") {
    return (
      <span
        className={cn(linkClass, "pointer-events-none select-none opacity-0")}
        aria-busy="true"
        aria-label="Cargando acceso"
      >
        Iniciar sesión
      </span>
    );
  }

  if (authView !== "authenticated" || !sessionUser) {
    return (
      <Link href={ROUTES.login} className={linkClass}>
        Iniciar sesión
      </Link>
    );
  }

  const primaryLink = getPublicNavAuthLink(sessionUser);
  const initial = getSessionUserInitial(sessionUser);
  const isCustomer = getEffectiveRole(sessionUser.profile) === ROLES.CUSTOMER;

  const menuItems = [
    { href: primaryLink.href, label: isCustomer ? "Mi cuenta" : primaryLink.label },
    ...(isCustomer
      ? [{ href: ROUTES.miCuentaEntradas, label: "Mis entradas" }]
      : []),
  ];

  if (stacked) {
    return (
      <div className="relative z-10 flex w-full flex-col gap-1 pointer-events-auto">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            {item.label}
          </Link>
        ))}
        <LogoutButton
          variant="public-header"
          redirectTo={ROUTES.login}
          onSignedOut={() => {
            setSessionUser(null);
            setAuthView("guest");
            setMenuOpen(false);
          }}
          className="w-full justify-start"
        />
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative z-10 pointer-events-auto">
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={`${menuId}-menu`}
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(linkClass, "gap-2")}
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
        <span aria-hidden className="text-xs public-text-soft">
          ▾
        </span>
      </button>

      {menuOpen ? (
        <div
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-2xl border py-1 shadow-lg"
          style={{
            borderColor: "var(--public-border)",
            backgroundColor: "var(--public-card)",
          }}
        >
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block px-4 py-2.5 text-sm public-heading transition hover:bg-[var(--public-header-hover)]"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t" style={{ borderColor: "var(--public-border)" }} />
          <LogoutButton
            variant="public-header"
            redirectTo={ROUTES.login}
            onSignedOut={() => {
              setSessionUser(null);
              setAuthView("guest");
              setMenuOpen(false);
            }}
            className="w-full justify-start rounded-none px-4"
          />
        </div>
      ) : null}
    </div>
  );
}
