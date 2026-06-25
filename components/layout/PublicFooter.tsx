import Link from "next/link";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { PUBLIC_NAV_LINKS } from "@/lib/constants/routes";
import {
  buildWhatsappUrl,
  FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE,
} from "@/lib/site/queries";
import type { SiteSettings } from "@/lib/site/types";

type PublicFooterProps = {
  settings: SiteSettings;
};

export function PublicFooter({ settings }: PublicFooterProps) {
  const instagramUrl = settings.instagram_url?.trim();
  const email = settings.contact_email?.trim();
  const phone = settings.contact_phone?.trim();
  const whatsapp = settings.contact_whatsapp?.trim();
  const location = settings.contact_location?.trim();
  const whatsappUrl = whatsapp ? buildWhatsappUrl(whatsapp) : "";
  const partnershipWhatsappUrl = whatsapp
    ? buildWhatsappUrl(whatsapp, FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE)
    : "";

  const hasContact = Boolean(email || phone || whatsapp || location || instagramUrl);

  return (
    <footer
      className="mt-auto border-t"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-footer-bg)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
          <div>
            <p className="text-sm public-text-soft">
              Australe Producciones · Encuentros, cultura y comunidad
            </p>

            {hasContact ? (
              <div className="mt-5 space-y-2 text-sm public-text-muted">
                <p className="font-semibold public-heading">Contacto</p>
                {email ? (
                  <p>
                    <a href={`mailto:${email}`} className="public-link">
                      {email}
                    </a>
                  </p>
                ) : null}
                {phone ? (
                  <p>
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="public-link">
                      {phone}
                    </a>
                  </p>
                ) : null}
                {whatsapp && whatsappUrl ? (
                  <p>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="public-link"
                    >
                      WhatsApp
                    </a>
                  </p>
                ) : null}
                {location ? <p>{location}</p> : null}
                {instagramUrl ? (
                  <p>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram de Australe Producciones"
                      className="public-link inline-flex items-center gap-2 font-medium transition hover:text-[var(--public-primary)]"
                    >
                      <InstagramIcon className="h-5 w-5" />
                      <span>Instagram</span>
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 text-sm public-text-muted md:justify-end">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-[var(--public-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <section
          aria-labelledby="footer-partnership-cta"
          className="mt-8 rounded-2xl border bg-gradient-to-br from-purple-50/90 via-white/95 to-[var(--public-footer-bg)] p-5 shadow-[0_4px_24px_rgba(155,126,222,0.08)] sm:p-6"
          style={{ borderColor: "var(--public-border)" }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0 flex-1">
              <h2
                id="footer-partnership-cta"
                className="text-base font-bold public-heading sm:text-lg"
              >
                ¿Querés ser parte de Australe?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed public-text-muted">
                Sumate a las empresas y emprendimientos que nos acompañan. Trabajemos juntos
                para crear nuevas experiencias, eventos y oportunidades.
              </p>
            </div>

            {partnershipWhatsappUrl ? (
              <a
                href={partnershipWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="public-btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition sm:w-auto sm:min-w-[11rem]"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Quiero ser parte
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </footer>
  );
}
