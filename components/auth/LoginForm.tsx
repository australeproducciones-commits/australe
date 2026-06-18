"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import {
  completeAuthFlow,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth/authActions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type AuthMode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetMessages() {
    setError(null);
    setInfo(null);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    resetMessages();
  }

  function validateFields(): string | null {
    if (!email.trim() || !password.trim()) {
      return "Completá todos los campos obligatorios.";
    }

    if (mode === "signup" && (!fullName.trim() || !whatsapp.trim())) {
      return "Completá todos los campos obligatorios.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const validationError = validateFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email.trim(), password);
        const redirectPath = await completeAuthFlow();
        router.push(redirectPath);
        router.refresh();
        return;
      }

      const { session } = await signUpWithEmail(
        email.trim(),
        password,
        fullName.trim(),
        whatsapp.trim(),
      );

      if (!session) {
        setInfo(
          "Cuenta creada. Revisá tu email para confirmar tu cuenta antes de ingresar.",
        );
        setMode("login");
        return;
      }

      const redirectPath = await completeAuthFlow(
        fullName.trim(),
        whatsapp.trim(),
      );
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error. Intentá de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicCard padding="lg">
      <SectionHeading
        label="Australe Producciones"
        title={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        subtitle={
          mode === "login"
            ? "Ingresá con tu email y contraseña."
            : "Registrate para acceder a eventos y tu cuenta."
        }
      />

      <div className="public-segmented mt-6">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={cn(
            "public-segmented-btn",
            mode === "login" && "public-segmented-btn-active",
          )}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={cn(
            "public-segmented-btn",
            mode === "signup" && "public-segmented-btn-active",
          )}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm public-text-muted">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="public-input"
                autoComplete="name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="whatsapp" className="mb-2 block text-sm public-text-muted">
                WhatsApp
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+54 9 ..."
                className="public-input"
                autoComplete="tel"
                disabled={loading}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm public-text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="public-input"
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm public-text-muted">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="public-input"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={loading}
            minLength={6}
          />
        </div>

        {error ? <p className="public-alert-error">{error}</p> : null}
        {info ? <p className="public-alert-warning">{info}</p> : null}

        <PublicButton type="submit" className="w-full" size="lg" disabled={loading}>
          {loading
            ? "Procesando..."
            : mode === "login"
              ? "Ingresar"
              : "Crear cuenta"}
        </PublicButton>
      </form>

      <div className="mt-6 text-center">
        <PublicButton href={ROUTES.home} variant="ghost" size="sm">
          Volver al inicio
        </PublicButton>
      </div>
    </PublicCard>
  );
}
