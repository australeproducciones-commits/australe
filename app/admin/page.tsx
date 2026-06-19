import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import { AdminQueryErrorCard } from "@/components/admin/AdminQueryErrorCard";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { parseDashboardFilters } from "@/lib/admin/dashboard/period";
import { getAdminDashboardData } from "@/lib/admin/dashboard/queries";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";

export const metadata: Metadata = {
  title: "Panel de administración",
};

type AdminPageProps = {
  searchParams: Promise<{
    period?: string;
    event?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const filters = parseDashboardFilters(params);
  let data: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null;
  let loadError: string | null = null;

  try {
    data = await getAdminDashboardData(filters);
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  if (loadError || !data) {
    return (
      <>
        <AdminHeader
          title="Panel de administración"
          description="Resumen operativo y métricas del negocio."
        />
        <div className="px-4 py-8 sm:px-8">
          <AdminQueryErrorCard message={loadError ?? "No se pudieron cargar los datos del panel."} />
        </div>
      </>
    );
  }

  return <AdminDashboard data={data} />;
}
