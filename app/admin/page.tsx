import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import { parseDashboardFilters } from "@/lib/admin/dashboard/period";
import { getAdminDashboardData } from "@/lib/admin/dashboard/queries";

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
  const data = await getAdminDashboardData(filters);

  return <AdminDashboard data={data} />;
}
