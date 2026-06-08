"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";

export function MiCuentaAuthBar() {
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const profile = await getProfile(supabase);
      setFullName(profile?.full_name ?? null);
      setLoading(false);
    }

    loadProfile();
  }, []);

  return (
    <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-zinc-400">Sesión activa</p>
        <p className="font-semibold text-white">
          {loading ? "Cargando..." : fullName ?? "Usuario"}
        </p>
      </div>
      <LogoutButton />
    </Card>
  );
}
