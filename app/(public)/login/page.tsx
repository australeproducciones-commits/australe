import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { BRAND_LOGO_ON_DARK } from "@/lib/constants/branding";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginPage() {
  return (
    <div className="australe-auth-shell">
      <LinkLogo />
      <div className="australe-auth-card">
        <Suspense
          fallback={
            <div className="public-muted-box p-6 text-sm">Cargando...</div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LinkLogo() {
  return (
    <Link
      href={ROUTES.home}
      className="relative z-10 mb-8 transition hover:opacity-90"
      aria-label="Australe Producciones — inicio"
    >
      <Image
        src={BRAND_LOGO_ON_DARK}
        alt="Australe Producciones"
        width={200}
        height={64}
        priority
        className="h-auto w-[140px] object-contain sm:w-[160px]"
      />
    </Link>
  );
}
