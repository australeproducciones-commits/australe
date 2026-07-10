import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunityUsersPanel } from "@/components/admin/community/AdminCommunityUsersPanel";
import {
  getCommunityLevelsForAdmin,
  normalizeCommunityUsersFilter,
  normalizeCommunityUsersPage,
  normalizeCommunityUsersPageSize,
  normalizeCommunityUsersSort,
  normalizeOptionalBalance,
  searchCommunityUsers,
} from "@/lib/community/admin/user-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Usuarios",
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
    level?: string;
    minBalance?: string;
    maxBalance?: string;
    invite?: string;
  }>;
};

export default async function AdminComunidadUsuariosPage({
  searchParams,
}: PageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const filter = normalizeCommunityUsersFilter(params.filter);
  const sort = normalizeCommunityUsersSort(params.sort);
  const page = normalizeCommunityUsersPage(params.page);
  const pageSize = normalizeCommunityUsersPageSize(params.pageSize);
  const search = params.q?.trim() ?? "";
  const levelId = params.level?.trim() || undefined;
  const minBalance = normalizeOptionalBalance(params.minBalance);
  const maxBalance = normalizeOptionalBalance(params.maxBalance);

  const [result, levels] = await Promise.all([
    searchCommunityUsers({
      search,
      filter,
      sort,
      page,
      pageSize,
      levelId,
      minBalance,
      maxBalance,
    }),
    getCommunityLevelsForAdmin(),
  ]);

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Consultá, filtrá e invitá usuarios de la comunidad."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando usuarios…</p>}>
        <AdminCommunityUsersPanel
          result={result}
          levels={levels}
          initialSearch={search}
          initialFilter={filter}
          initialSort={sort}
          initialLevelId={levelId ?? ""}
          initialMinBalance={minBalance !== undefined ? String(minBalance) : ""}
          initialMaxBalance={maxBalance !== undefined ? String(maxBalance) : ""}
        />
      </Suspense>
    </AdminCommunityShell>
  );
}
