import { PostLoginAdModal } from "@/components/advertising/PostLoginAdModal";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PartnersSection } from "@/components/layout/PartnersSection";
import { PublicAnalyticsTracker } from "@/components/analytics/PublicAnalyticsTracker";
import { StoreShell } from "@/components/store/StoreShell";
import {
  EMPTY_SITE_SETTINGS,
  getActivePartners,
  getSiteSettings,
} from "@/lib/site/queries";
import { buildWhatsappUrl, FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE } from "@/lib/site/contact";

type PublicThemeShellProps = {
  children: React.ReactNode;
};

export async function PublicThemeShell({ children }: PublicThemeShellProps) {
  const [settings, partners] = await Promise.all([
    getSiteSettings().catch(() => EMPTY_SITE_SETTINGS),
    getActivePartners().catch(() => []),
  ]);

  const partnershipWhatsappUrl = settings.contact_whatsapp
    ? buildWhatsappUrl(settings.contact_whatsapp, FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE)
    : "";

  return (
    <div className="public-theme flex min-h-screen flex-col">
      <PublicAnalyticsTracker />
      <PublicHeader />
      <StoreShell>
        <div className="flex-1">{children}</div>
      </StoreShell>
      <PartnersSection
        partners={partners}
        partnershipWhatsappUrl={partnershipWhatsappUrl}
      />
      <PublicFooter settings={settings} />
      <PostLoginAdModal />
    </div>
  );
}
