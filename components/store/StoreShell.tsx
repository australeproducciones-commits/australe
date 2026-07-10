"use client";

import { StoreCartProvider } from "@/components/store/StoreCartProvider";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return <StoreCartProvider>{children}</StoreCartProvider>;
}
