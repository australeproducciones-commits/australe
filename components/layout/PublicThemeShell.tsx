import { PostLoginAdModal } from "@/components/advertising/PostLoginAdModal";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PartnersSection } from "@/components/layout/PartnersSection";
import { PublicAnalyticsTracker } from "@/components/analytics/PublicAnalyticsTracker";
import {
  EMPTY_SITE_SETTINGS,
  getActivePartners,
  getSiteSettings,
} from "@/lib/site/queries";

type PublicThemeShellProps = {
  children: React.ReactNode;
};

export async function PublicThemeShell({ children }: PublicThemeShellProps) {
  const [settings, partners] = await Promise.all([
    getSiteSettings().catch(() => EMPTY_SITE_SETTINGS),
    getActivePartners().catch(() => []),
  ]);

  return (
    <div className="public-theme flex min-h-screen flex-col">
      <PublicAnalyticsTracker />
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PartnersSection partners={partners} />
      <PublicFooter settings={settings} />
      <PostLoginAdModal />
    </div>
  );
}
