import Link from "next/link";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { PUBLIC_NAV_LINKS } from "@/lib/constants/routes";
import { buildWhatsappUrl } from "@/lib/site/queries";
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
      </div>
    </footer>
  );
}
