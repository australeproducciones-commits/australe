import { PublicFooter } from "@/components/layout/PublicFooter";
import { PartnersSection } from "@/components/layout/PartnersSection";
import {
  EMPTY_SITE_SETTINGS,
  getActivePartners,
  getSiteSettings,
} from "@/lib/site/queries";
import { buildWhatsappUrl, FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE } from "@/lib/site/contact";

export async function PublicPartnersFooter() {
  const [settings, partners] = await Promise.all([
    getSiteSettings().catch(() => EMPTY_SITE_SETTINGS),
    getActivePartners().catch(() => []),
  ]);

  const partnershipWhatsappUrl = settings.contact_whatsapp
    ? buildWhatsappUrl(settings.contact_whatsapp, FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE)
    : "";

  return (
    <>
      <PartnersSection
        partners={partners}
        partnershipWhatsappUrl={partnershipWhatsappUrl}
      />
      <PublicFooter settings={settings} />
    </>
  );
}
