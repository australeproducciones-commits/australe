import { StoreHomeHeroClient } from "@/components/store/StoreHomeHeroClient";
import type { StoreHeroSettings } from "@/lib/store/settings/types";

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
    <section className="store-hero-premium store-hero-glow relative overflow-hidden border-b border-[var(--public-border)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 85% 25%, rgba(139, 92, 246, 0.18), transparent 60%), radial-gradient(ellipse 40% 35% at 10% 90%, rgba(167, 139, 219, 0.1), transparent 55%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <StoreHomeHeroClient
          settings={settings}
          title={title}
          desktopImageUrl={desktopImageUrl}
          mobileImageUrl={mobileImageUrl}
          desktopAlt={desktopAlt}
          mobileAlt={mobileAlt}
          showSecondaryButton={showSecondaryButton}
          showFloatingBadge={showFloatingBadge}
        />
      </div>
    </section>
  );
}
