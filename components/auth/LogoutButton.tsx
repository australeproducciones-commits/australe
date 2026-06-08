"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth/authActions";
import { cn } from "@/lib/utils/cn";

type LogoutButtonProps = {
  className?: string;
  variant?: "header" | "default";
};

export function LogoutButton({
  className,
  variant = "default",
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "font-semibold transition disabled:opacity-50",
        variant === "header"
          ? "rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white sm:px-4"
          : "rounded-2xl border border-white/20 px-6 py-3 text-sm text-white hover:bg-white/10",
        className,
      )}
    >
      {loading ? "Saliendo..." : "Salir"}
    </button>
  );
}
