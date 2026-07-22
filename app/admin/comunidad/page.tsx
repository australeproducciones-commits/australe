import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminQueryErrorCard } from "@/components/admin/AdminQueryErrorCard";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunitySummaryPanel } from "@/components/admin/community/AdminCommunitySummary";
import { getAdminCommunitySummary } from "@/lib/community/loyalty/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";
import { ROUTES } from "@/lib/constants/routes";
import { QueryTimeoutError } from "@/lib/supabase/queryTimeout";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";

export const metadata: Metadata = {
  title: "Admin · Comunidad",
};

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminComunidadResumenPage({
  searchParams,
}: PageProps) {
  await requireAdminPage();
  const params = await searchParams;

  if (params.tab === "miembros") {
    redirect(ROUTES.adminComunidadUsuarios);
  }
  if (params.tab === "recompensas") {
    redirect(ROUTES.adminComunidadRecompensas);
  }
  if (params.tab === "movimientos") {
    redirect(ROUTES.adminComunidadMovimientos);
  }
  if (params.tab === "configuracion") {
    redirect(ROUTES.adminComunidadConfiguracion);
  }
  if (params.tab === "invitaciones") {
    redirect(ROUTES.adminComunidadInvitaciones);
  }

  const summaryResult = await (async () => {
    try {
      return { summary: await getAdminCommunitySummary(), loadError: null };
    } catch (error) {
      if (error instanceof QueryTimeoutError) {
        return {
          summary: null,
          loadError:
            "El resumen de comunidad tardó demasiado en cargar. Intentá de nuevo en unos segundos.",
        };
      }
      if (isSupabaseQueryError(error)) {
        return { summary: null, loadError: error.userMessage };
      }
      throw error;
    }
  })();

  if (summaryResult.loadError || !summaryResult.summary) {
    return (
      <AdminCommunityShell variant="dashboard">
        <AdminQueryErrorCard message={summaryResult.loadError ?? "No se pudo cargar el resumen de comunidad."} />
      </AdminCommunityShell>
    );
  }

  return (
    <AdminCommunityShell variant="dashboard">
      <AdminCommunitySummaryPanel summary={summaryResult.summary} />
    </AdminCommunityShell>
  );
}
