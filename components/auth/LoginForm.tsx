"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import {
  completeAuthFlow,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth/authActions";
import {
  getReturnToFromSearchParams,
  POST_LOGIN_AD_SESSION_KEY,
} from "@/lib/auth/loginRedirect";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type AuthMode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getReturnToFromSearchParams(searchParams);
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
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
        if (!rememberSession) {
          sessionStorage.setItem("australe-session-only", "1");
        } else {
          sessionStorage.removeItem("australe-session-only");
        }
        const rolePath = await completeAuthFlow();
        const finalPath = returnTo ?? rolePath;
        sessionStorage.setItem(POST_LOGIN_AD_SESSION_KEY, "1");
        router.push(finalPath);
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

      const rolePath = await completeAuthFlow(
        fullName.trim(),
        whatsapp.trim(),
      );
      const finalPath = returnTo ?? rolePath;
      sessionStorage.setItem(POST_LOGIN_AD_SESSION_KEY, "1");
      router.push(finalPath);
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="public-input pr-11"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              disabled={loading}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex items-center px-3 public-text-muted transition hover:public-heading disabled:opacity-50"
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
                  <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 7.5a11.62 11.62 0 0 1-2.12 3.17M6.12 6.12A11.8 11.8 0 0 0 1 11.5C2.73 15.89 7 19 12 19a10.9 10.9 0 0 0 5.05-1.23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error ? <p className="public-alert-error">{error}</p> : null}
        {info ? <p className="public-alert-warning">{info}</p> : null}

        {mode === "login" ? (
          <label className="flex items-start gap-3 text-sm public-text-muted">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-[var(--public-border)]"
            />
            <span>Mantener mi sesión iniciada</span>
          </label>
        ) : null}

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
