"use client";

import { usePathname } from "next/navigation";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { cn } from "@/lib/utils/cn";

const DARK_ROUTES = new Set(["/", "/eventos"]);

type PublicThemeShellProps = {
  children: React.ReactNode;
};

export function PublicThemeShell({ children }: PublicThemeShellProps) {
  const pathname = usePathname();
  const isDark = DARK_ROUTES.has(pathname);

  return (
    <div
      className={cn(
        "public-theme flex min-h-screen flex-col",
        isDark && "public-theme-dark",
      )}
    >
      <PublicHeader dark={isDark} />
      <div className="flex-1">{children}</div>
      <PublicFooter dark={isDark} />
    </div>
  );
}
