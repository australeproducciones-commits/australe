"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import {
  recordPartnerClickAction,
  recordPartnerViewsAction,
} from "@/lib/site/actions";
import type { Partner } from "@/lib/site/types";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import { cn } from "@/lib/utils/cn";

type PartnersSectionProps = {
  partners: Partner[];
  partnershipWhatsappUrl?: string;
};

export function PartnersSection({
  partners,
  partnershipWhatsappUrl = "",
}: PartnersSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackedIds = useRef(new Set<string>());
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          revealObserver.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    revealObserver.observe(section);

    return () => {
      revealObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || partners.length === 0) {
      return;
    }

    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    function flushViews() {
      if (pending.size === 0) {
        return;
      }

      const batch = [...pending];
      pending.clear();
      void recordPartnerViewsAction(batch).catch(() => undefined);
    }

    function scheduleFlush() {
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      flushTimer = setTimeout(flushViews, 400);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const partnerId = entry.target.getAttribute("data-partner-id");
          if (!partnerId || trackedIds.current.has(partnerId)) {
            continue;
          }

          trackedIds.current.add(partnerId);
          pending.add(partnerId);
          observer.unobserve(entry.target);
        }

        scheduleFlush();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
    );

    section.querySelectorAll("[data-partner-id]").forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      flushViews();
    };
  }, [partners]);

  if (partners.length === 0) {
    return null;
  }

  const gridClassName = cn(
    "mt-8 grid min-w-0 gap-4 sm:gap-5",
    partners.length === 1
      ? "mx-auto max-w-xs grid-cols-1"
      : partners.length === 2
        ? "mx-auto max-w-2xl grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  );

  return (
    <section
      ref={sectionRef}
      className={cn(
        "home-partners-section overflow-hidden border-t py-12 sm:py-16",
        revealed && "home-partners-section--in-view",
      )}
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg-section)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Empresas que hacen posible cada experiencia"
          subtitle="Marcas, emprendimientos y aliados que comparten nuestra forma de crear encuentros."
        />

        <ul
          className={gridClassName}
          aria-label="Empresas que hacen posible cada experiencia"
        >
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </ul>

        <div className="home-partners-cta mt-12 rounded-3xl border border-[var(--public-border)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0 flex-1 text-center md:text-left">
              <h2 className="text-lg font-bold sm:text-xl">¿Querés ser parte de Australe?</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--public-text-secondary)] md:mx-0">
                Sumate a las empresas y emprendimientos que nos acompañan. Trabajemos
                juntos para crear nuevas experiencias, eventos y oportunidades.
              </p>
            </div>

            {partnershipWhatsappUrl ? (
              <a
                href={partnershipWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="public-btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold sm:w-auto sm:min-w-[11rem]"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Quiero ser parte
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const content = (
    <div className="flex h-20 w-full items-center justify-center p-2 sm:h-24">
      <RemoteImage
        src={partner.image_url}
        alt={partner.name}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );

  const cardClassName = cn(
    "home-partner-card flex h-full min-h-[7.5rem] items-center justify-center rounded-2xl border p-4 transition motion-safe:duration-300",
    "border-[var(--public-border)] bg-[var(--public-card)]/50",
    partner.destination_url
      ? "hover:border-[rgba(167,139,219,0.25)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] motion-safe:hover:-translate-y-0.5"
      : "cursor-default",
  );

  if (partner.destination_url) {
    return (
      <li data-partner-id={partner.id} className="min-w-0">
        <Link
          href={partner.destination_url}
          target={partner.open_in_new_tab ? "_blank" : undefined}
          rel={partner.open_in_new_tab ? "noopener noreferrer" : undefined}
          className={cardClassName}
          title={partner.name}
          aria-label={`Visitar sitio de ${partner.name}`}
          onClick={() => {
            void recordPartnerClickAction(partner.id).catch(() => undefined);
          }}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li data-partner-id={partner.id} className="min-w-0">
      <div className={cardClassName} title={partner.name}>
        {content}
      </div>
    </li>
  );
}
