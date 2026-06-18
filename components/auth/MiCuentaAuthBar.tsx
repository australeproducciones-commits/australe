"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/client";

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
    <PublicCard className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm public-text-muted">Sesión activa</p>
        <p className="public-heading font-semibold">
          {loading ? "Cargando..." : fullName ?? "Usuario"}
        </p>
      </div>
      <LogoutButton variant="public" />
    </PublicCard>
  );
}
