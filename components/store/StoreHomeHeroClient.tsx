"use client";

import type { ReactNode } from "react";
import { StoreHeroImage } from "@/components/store/StoreHeroImage";
import { StoreCommunityHeroSlide } from "@/components/store/StoreCommunityHeroSlide";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import { PublicButton } from "@/components/ui/public";
import type { StoreHeroSettings } from "@/lib/store/settings/types";

const STORE_HERO_INTERVAL_MS = 5500;

type StoreHomeHeroClientProps = {
  settings: StoreHeroSettings;
  title: ReactNode;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  desktopAlt: string;
  mobileAlt: string;
  showSecondaryButton: boolean;
  showFloatingBadge: boolean;
};

function StoreHeroMainSlide({
  settings,
  title,
  desktopImageUrl,
  mobileImageUrl,
  desktopAlt,
  mobileAlt,
  showSecondaryButton,
  showFloatingBadge,
}: StoreHomeHeroClientProps) {
  return (
    <article
      className="grid gap-10 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14"
      aria-labelledby="store-hero-title"
    >
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
              <StoreHeroImage
                src={mobileImageUrl}
                alt={mobileAlt}
                priority
                variant="campaign"
                sizes="(max-width: 1023px) 100vw, 0px"
                aspectClassName="aspect-[4/5] max-h-[min(72vh,560px)]"
              />
            </div>

            <div className="hidden lg:block">
              <StoreHeroImage
                src={desktopImageUrl}
                alt={desktopAlt}
                priority
                variant="campaign"
                sizes="(min-width: 1024px) 50vw, 0px"
                aspectClassName="aspect-square max-h-[min(72vh,640px)]"
              />
            </div>

            {showFloatingBadge ? (
              <p className="store-hero-editorial-tag" aria-hidden>
                {settings.hero_badge_text}
              </p>
            ) : null}
        </div>
      </div>
    </article>
  );
}

export function StoreHomeHeroClient(props: StoreHomeHeroClientProps) {
  return (
    <HomeHeroCarousel
      ariaLabel="Hero de la tienda Australe"
      intervalMs={STORE_HERO_INTERVAL_MS}
      className="relative min-h-[560px] lg:min-h-[720px]"
      slides={[
        <StoreHeroMainSlide key="store-main" {...props} />,
        <StoreCommunityHeroSlide key="store-community" />,
      ]}
    />
  );
}
