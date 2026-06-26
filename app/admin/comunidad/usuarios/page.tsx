import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunityUsersPanel } from "@/components/admin/community/AdminCommunityUsersPanel";
import { searchCommunityUsers } from "@/lib/community/admin/user-queries";
import {
  COMMUNITY_USERS_FILTER,
  COMMUNITY_USERS_SORT,
  type CommunityUsersFilter,
  type CommunityUsersSort,
} from "@/lib/community/admin/types";
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
    invite?: string;
  }>;
};

function parseFilter(value?: string): CommunityUsersFilter {
  const values = Object.values(COMMUNITY_USERS_FILTER);
  if (value && values.includes(value as CommunityUsersFilter)) {
    return value as CommunityUsersFilter;
  }
  return COMMUNITY_USERS_FILTER.ALL;
}

function parseSort(value?: string): CommunityUsersSort {
  const values = Object.values(COMMUNITY_USERS_SORT);
  if (value && values.includes(value as CommunityUsersSort)) {
    return value as CommunityUsersSort;
  }
  return COMMUNITY_USERS_SORT.REGISTERED_DESC;
}

export default async function AdminComunidadUsuariosPage({
  searchParams,
}: PageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const sort = parseSort(params.sort);
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const search = params.q?.trim() ?? "";

  const result = await searchCommunityUsers({
    search,
    filter,
    sort,
    page,
  });

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Consultá, filtrá e invitá usuarios de la comunidad."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando usuarios…</p>}>
        <AdminCommunityUsersPanel
          result={result}
          initialSearch={search}
          initialFilter={filter}
          initialSort={sort}
        />
      </Suspense>
    </AdminCommunityShell>
  );
}
