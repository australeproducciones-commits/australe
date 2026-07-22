"use client";

import { useEffect } from "react";

const PUBLIC_THEME_SELECTOR = ".public-theme";
const PREMIUM_CLASS = "store-theme";

/**
 * Activa el tema premium oscuro (mismo sistema visual que la tienda)
 * en el shell público mientras la home está montada.
 */
export function HomePremiumTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.querySelector(PUBLIC_THEME_SELECTOR);
    if (!root) {
      return;
    }

    root.classList.add(PREMIUM_CLASS);

    return () => {
      root.classList.remove(PREMIUM_CLASS);
    };
  }, []);

  return <>{children}</>;
}
