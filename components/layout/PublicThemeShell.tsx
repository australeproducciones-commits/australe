import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicAnalyticsTracker } from "@/components/analytics/PublicAnalyticsTracker";

type PublicThemeShellProps = {
  children: React.ReactNode;
};

export function PublicThemeShell({ children }: PublicThemeShellProps) {
  return (
    <div className="public-theme flex min-h-screen flex-col">
      <PublicAnalyticsTracker />
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
