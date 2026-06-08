"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  completeAuthFlow,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth/authActions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type AuthMode = "login" | "signup";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30";

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
    <Card padding="lg">
      <p className="text-xs uppercase tracking-[0.3em] text-purple-300">
        Australe Producciones
      </p>
      <h1 className="mt-4 text-3xl font-black text-white">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        {mode === "login"
          ? "Ingresá con tu email y contraseña."
          : "Registrate para acceder a eventos y tu cuenta."}
      </p>

      <div className="mt-6 flex rounded-2xl border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
            mode === "login"
              ? "bg-purple-500 text-white"
              : "text-zinc-400 hover:text-white",
          )}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
            mode === "signup"
              ? "bg-purple-500 text-white"
              : "text-zinc-400 hover:text-white",
          )}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm text-zinc-400">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className={inputClassName}
                autoComplete="name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="whatsapp" className="mb-2 block text-sm text-zinc-400">
                WhatsApp
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+54 9 ..."
                className={inputClassName}
                autoComplete="tel"
                disabled={loading}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-zinc-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={inputClassName}
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm text-zinc-400">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClassName}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={loading}
            minLength={6}
          />
        </div>

        {error && (
          <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {info && (
          <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {info}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading
            ? "Procesando..."
            : mode === "login"
              ? "Ingresar"
              : "Crear cuenta"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Button href={ROUTES.home} variant="ghost" size="sm">
          Volver al inicio
        </Button>
      </div>
    </Card>
  );
}
