import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getAdminNavLinksForRole } from "@/lib/auth/adminNav";
import { getEffectiveRole } from "@/lib/auth/routeAccess";
import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { getPendingSalesCount } from "@/lib/ticket-sales/pendingSales";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const role = getEffectiveRole(profile);

  let pendingSalesCount = 0;
  if (role === ROLES.ADMIN) {
    try {
      pendingSalesCount = await getPendingSalesCount();
    } catch {
      pendingSalesCount = 0;
    }
  }

  const navLinks = getAdminNavLinksForRole(role);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <AdminSidebar
        pendingSalesCount={pendingSalesCount}
        navLinks={navLinks}
      />
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
    </div>
  );
}
