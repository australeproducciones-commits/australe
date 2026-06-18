import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getPendingSalesCount } from "@/lib/ticket-sales/pendingSales";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let pendingSalesCount = 0;
  try {
    pendingSalesCount = await getPendingSalesCount();
  } catch {
    pendingSalesCount = 0;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <AdminSidebar pendingSalesCount={pendingSalesCount} />
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
    </div>
  );
}
