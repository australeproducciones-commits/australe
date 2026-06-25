import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminCommunityNav } from "@/components/admin/community/AdminCommunityNav";

type AdminCommunityShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AdminCommunityShell({
  title,
  description,
  children,
}: AdminCommunityShellProps) {
  return (
    <>
      <AdminHeader title={title} description={description} />
      <div className="border-b border-white/10 bg-black/10 px-4 sm:px-8">
        <AdminCommunityNav />
      </div>
      <div className="px-4 py-8 sm:px-8">{children}</div>
    </>
  );
}
