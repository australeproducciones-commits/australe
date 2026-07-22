import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import {
  getAdminGiveawayAuditLogs,
  getGiveawayById,
} from "@/lib/community/giveaways/queries";
import { requireAdminPage } from "@/lib/events/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Admin · Sorteo · Auditoría",
};

export default async function AdminComunidadSorteoAuditoriaPage({ params }: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const giveaway = await getGiveawayById(id);
  if (!giveaway) notFound();

  const logs = await getAdminGiveawayAuditLogs(id);

  return (
    <AdminCommunityShell title="Comunidad" description={`Auditoría · ${giveaway.name}`}>
      <div className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin registros de auditoría.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-white">{log.action}</span>
                <span className="text-xs text-zinc-500">
                  {new Date(log.created_at).toLocaleString("es-AR")}
                </span>
              </div>
              {log.entity_type ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id}` : ""}
                </p>
              ) : null}
              {log.new_data ? (
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-400">
                  {JSON.stringify(log.new_data, null, 2)}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </AdminCommunityShell>
  );
}
