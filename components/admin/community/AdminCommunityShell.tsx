import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminCommunityNav } from "@/components/admin/community/AdminCommunityNav";
import { cn } from "@/lib/utils/cn";

type AdminCommunityShellProps = {
  children: React.ReactNode;
  variant?: "default" | "dashboard";
  title?: string;
  description?: string;
};

export function AdminCommunityShell({
  children,
  variant = "default",
  title,
  description,
}: AdminCommunityShellProps) {
  const isDashboard = variant === "dashboard";

  return (
    <>
      {isDashboard ? null : (
        <AdminHeader
          title={title ?? "Comunidad"}
          description={description}
        />
      )}
      <div
        className={cn(
          "border-b border-white/10",
          isDashboard ? "bg-zinc-950" : "bg-black/10",
        )}
      >
        <div className={cn("px-4 sm:px-8", isDashboard ? "pt-4" : "")}>
          <AdminCommunityNav />
        </div>
      </div>
      <div
        className={cn(
          "px-4 sm:px-8",
          isDashboard ? "bg-zinc-950 py-6" : "py-8",
        )}
      >
        {children}
      </div>
    </>
  );
}
