import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getAdminNavLinksForRole } from "@/lib/auth/adminNav";
import { getEffectiveRoleFromProfile, getRequestProfile } from "@/lib/auth/requestAuth";
import { ROLES } from "@/lib/constants/roles";
import { getPendingSalesCount } from "@/lib/ticket-sales/pendingSales";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getRequestProfile();
  const role = getEffectiveRoleFromProfile(profile);

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
