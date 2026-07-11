import { StoreHeroImage } from "@/components/store/StoreHeroImage";
import { PublicButton } from "@/components/ui/public";
import type { StoreHeroSettings } from "@/lib/store/settings/types";
import { cn } from "@/lib/utils/cn";

type StoreHomeHeroProps = {
  settings: StoreHeroSettings;
  eventName?: string | null;
};

export function StoreHomeHero({ settings, eventName }: StoreHomeHeroProps) {
  if (!settings.hero_enabled) {
    return null;
  }

  const desktopImageUrl = settings.hero_desktop_image_url;
  const mobileImageUrl = settings.hero_mobile_image_url ?? settings.hero_desktop_image_url;
  const desktopAlt =
    settings.hero_desktop_image_alt ?? "Campaña de merchandising oficial Australe";
  const mobileAlt =
    settings.hero_mobile_image_alt ?? settings.hero_desktop_image_alt ?? desktopAlt;

  const showSecondaryButton = Boolean(
    settings.hero_secondary_button_label?.trim() &&
      settings.hero_secondary_button_url?.trim(),
  );

  const showFloatingBadge =
    settings.hero_badge_enabled && Boolean(settings.hero_badge_text?.trim());

  const title = eventName ? (
    <>
      Merch de <span className="store-gradient-text">{eventName}</span>
    </>
  ) : (
    settings.hero_title
  );

  return (
    <section
      className="store-hero-premium store-hero-glow relative overflow-hidden border-b border-[var(--public-border)]"
      aria-labelledby="store-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 85% 25%, rgba(139, 92, 246, 0.18), transparent 60%), radial-gradient(ellipse 40% 35% at 10% 90%, rgba(167, 139, 219, 0.1), transparent 55%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-20">
        <div className="store-fade-in relative z-10 order-1 lg:order-none">
          {settings.hero_eyebrow ? (
            <p className="store-badge store-hero-eyebrow">{settings.hero_eyebrow}</p>
          ) : null}

          <h1
            id="store-hero-title"
            className="mt-5 max-w-xl text-[clamp(2.25rem,5vw,3.5rem)] font-black leading-[1.05] tracking-tight text-[var(--public-text)]"
          >
            {title}
          </h1>

          {settings.hero_description ? (
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--public-text-secondary)] sm:text-lg">
              {settings.hero_description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <PublicButton
              href={settings.hero_primary_button_url}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              {settings.hero_primary_button_label}
            </PublicButton>
            {showSecondaryButton ? (
              <PublicButton
                href={settings.hero_secondary_button_url!}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                {settings.hero_secondary_button_label}
              </PublicButton>
            ) : null}
          </div>

          {settings.hero_footer_text ? (
            <p className="mt-8 max-w-lg text-sm leading-relaxed text-[var(--public-text-soft)]">
              {settings.hero_footer_text}
            </p>
          ) : null}
        </div>

        <div className="store-fade-in-delay relative order-2 lg:order-none">
          <div className="store-hero-campaign-frame relative mx-auto w-full max-w-lg lg:max-w-none">
            <div
              className="pointer-events-none absolute -left-8 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full blur-3xl lg:block"
              style={{ background: "var(--store-glow-strong)" }}
              aria-hidden
            />

            <div className="lg:hidden">
              <div className="store-hero-campaign-image relative overflow-hidden rounded-2xl">
                <StoreHeroImage
                  src={mobileImageUrl}
                  alt={mobileAlt}
                  priority
                  sizes="(max-width: 1023px) 100vw, 0px"
                  aspectClassName="aspect-[4/5]"
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="store-hero-campaign-image relative overflow-hidden rounded-2xl">
                <StoreHeroImage
                  src={desktopImageUrl}
                  alt={desktopAlt}
                  priority
                  sizes="(min-width: 1024px) 50vw, 0px"
                  aspectClassName="aspect-square"
                />
              </div>
            </div>

            {showFloatingBadge ? (
              <div
                className={cn(
                  "store-hero-float-badge pointer-events-none absolute z-10",
                  "right-4 top-4 sm:right-6 sm:top-6 lg:right-8 lg:top-8",
                )}
              >
                <span className="store-badge">{settings.hero_badge_text}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
