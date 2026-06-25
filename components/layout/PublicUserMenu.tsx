"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { PublicSessionUser } from "@/lib/auth/getPublicSessionUser";
import { getPublicNavAuthLink } from "@/lib/auth/getPublicNavAuth";
import { getEffectiveRole, normalizeRole } from "@/lib/auth/routeAccess";
import { getSessionUserInitial } from "@/lib/auth/resolvePublicSessionUser";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type PublicUserMenuProps = {
  stacked?: boolean;
  compact?: boolean;
};

const PROFILE_COLUMNS =
  "id, full_name, whatsapp, role, is_active, staff_all_events" as const;

async function resolveSessionUserFromClient(): Promise<PublicSessionUser | null> {
  const supabase = createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return null;
  }

  const user = session.user;
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !data) {
    return null;
  }

  return {
    email: user.email ?? null,
    profile: {
      id: data.id,
      full_name: data.full_name,
      whatsapp: data.whatsapp,
      role: normalizeRole(data.role),
      is_active: data.is_active,
      staff_all_events: data.staff_all_events ?? false,
    },
  };
}

export function PublicUserMenu({
  stacked = false,
  compact = false,
}: PublicUserMenuProps) {
  const menuId = useId();
  const [sessionUser, setSessionUser] = useState<PublicSessionUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const syncInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function syncSession() {
      if (syncInFlight.current) {
        return syncInFlight.current;
      }

      const task = (async () => {
        try {
          const resolved = await resolveSessionUserFromClient();
          if (!active) {
            return;
          }
          setSessionUser(resolved);
        } catch {
          if (!active) {
            return;
          }
          setSessionUser(null);
        } finally {
          if (active) {
            setSessionReady(true);
          }
          syncInFlight.current = null;
        }
      })();

      syncInFlight.current = task;
      return task;
    }

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      void syncSession();
    });

    return () => {
      active = false;
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
    "relative z-10 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition",
    stacked || compact
      ? compact && !stacked
        ? "public-text-muted hover:bg-[var(--public-header-hover)] hover:public-heading"
        : "w-full justify-start public-heading hover:bg-[var(--public-header-hover)]"
      : "public-text-muted hover:bg-[var(--public-header-hover)] hover:public-heading",
  );

  const isAuthenticated = sessionReady && sessionUser !== null;

  if (!isAuthenticated) {
    return (
      <Link href={ROUTES.login} className={linkClass}>
        Iniciar sesión
      </Link>
    );
  }

  const primaryLink = getPublicNavAuthLink(sessionUser);
  const initial = getSessionUserInitial(sessionUser);
  const isCustomer = getEffectiveRole(sessionUser.profile) === ROLES.CUSTOMER;

  const menuItems = isCustomer
    ? [
        { href: ROUTES.miCuenta, label: "Mi cuenta" },
        { href: ROUTES.miCuentaEntradas, label: "Mis entradas" },
      ]
    : [{ href: primaryLink.href, label: primaryLink.label }];

  if (stacked) {
    return (
      <div className="relative z-10 flex w-full flex-col gap-1">
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
            setSessionReady(true);
            setMenuOpen(false);
          }}
          className="w-full justify-start"
        />
      </div>
    );
  }

  if (compact) {
    return (
      <Link href={primaryLink.href} className={linkClass}>
        {primaryLink.label}
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative z-10">
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
          <div
            className="my-1 border-t"
            style={{ borderColor: "var(--public-border)" }}
          />
          <LogoutButton
            variant="public-header"
            redirectTo={ROUTES.login}
            onSignedOut={() => {
              setSessionUser(null);
              setSessionReady(true);
              setMenuOpen(false);
            }}
            className="w-full justify-start rounded-none px-4"
          />
        </div>
      ) : null}
    </div>
  );
}
