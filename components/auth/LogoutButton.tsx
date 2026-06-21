"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearClientAuthState, signOut } from "@/lib/auth/authActions";
import { signOutAction } from "@/lib/auth/signOutAction";
import { cn } from "@/lib/utils/cn";

type LogoutButtonProps = {
  className?: string;
  variant?: "header" | "default" | "public" | "public-header" | "admin-sidebar";
  redirectTo?: string;
  label?: string;
  onSignedOut?: () => void;
};

export function LogoutButton({
  className,
  variant = "default",
  redirectTo = "/login",
  label = "Salir",
  onSignedOut,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    onSignedOut?.();
    clearClientAuthState();

    try {
      await signOut();
      await signOutAction();
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  const displayLabel =
    variant === "admin-sidebar" || variant === "public-header"
      ? loading
        ? "Saliendo..."
        : "Cerrar sesión"
      : loading
        ? "Saliendo..."
        : label;

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading}
      className={cn(
        "relative z-10 font-semibold transition disabled:opacity-50 pointer-events-auto",
        variant === "header" &&
          "rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white sm:px-4",
        variant === "default" &&
          "rounded-2xl border border-white/20 px-6 py-3 text-sm text-white hover:bg-white/10",
        variant === "public" && "public-btn-outline rounded-2xl px-6 py-3 text-sm",
        variant === "public-header" &&
          "inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium public-text-muted transition hover:bg-[var(--public-header-hover)] hover:public-heading",
        variant === "admin-sidebar" &&
          "w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white",
        className,
      )}
    >
      {displayLabel}
    </button>
  );
}
