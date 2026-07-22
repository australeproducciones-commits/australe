import Link from "next/link";
import { EmailIcon } from "@/components/icons/EmailIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { PUBLIC_NAV_LINKS } from "@/lib/constants/routes";
import {
  buildWhatsappUrl,
  FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE,
} from "@/lib/site/contact";
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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="public-heading text-base font-bold">Australe Producciones</p>
            <p className="mt-3 text-sm leading-relaxed public-text-soft">
              Encuentros, cultura y comunidad en Mendoza.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold public-heading">Navegación</p>
            <nav className="mt-4 flex flex-col gap-2 text-sm public-text-muted">
              {PUBLIC_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-[var(--public-primary)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {hasContact ? (
            <div>
              <p className="text-sm font-semibold public-heading">Contacto</p>
              <div className="mt-4 space-y-3 text-sm public-text-muted">
                {email ? (
                  <p>
                    <a
                      href={`mailto:${email}`}
                      className="public-link inline-flex items-center gap-2 font-medium"
                    >
                      <EmailIcon className="h-5 w-5 shrink-0" />
                      <span>{email}</span>
                    </a>
                  </p>
                ) : null}
                {phone ? (
                  <p>
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="public-link font-medium"
                    >
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
                      className="public-link inline-flex items-center gap-2 font-medium"
                    >
                      <WhatsAppIcon className="h-5 w-5 shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                  </p>
                ) : null}
                {location ? <p className="leading-relaxed">{location}</p> : null}
                {instagramUrl ? (
                  <p>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram de Australe Producciones"
                      className="public-link inline-flex items-center gap-2 font-medium transition hover:text-[var(--public-primary)]"
                    >
                      <InstagramIcon className="h-5 w-5 shrink-0" />
                      <span>Instagram</span>
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2 lg:col-span-1">
            <p className="text-sm font-semibold public-heading">Comunidad</p>
            <p className="mt-3 text-sm leading-relaxed public-text-muted">
              Sumate a la red de personas y empresas que acompañan cada experiencia Australe.
            </p>
          </div>
        </div>

        <section
          aria-labelledby="footer-partnership-cta"
          className="public-footer-partnership mt-10 rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: "var(--public-border)" }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0 flex-1 text-center md:text-left">
              <h2
                id="footer-partnership-cta"
                className="text-base font-bold public-heading sm:text-lg"
              >
                ¿Querés ser parte de Australe?
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed public-text-muted md:mx-0">
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
