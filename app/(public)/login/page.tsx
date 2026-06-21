import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Suspense fallback={<div className="public-muted-box p-6 text-sm">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
