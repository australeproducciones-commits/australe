"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
};

export function PartnersSection({ partners }: PartnersSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackedIds = useRef(new Set<string>());

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
      className="overflow-hidden border-t py-10 sm:py-14"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg-section)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Empresas que nos acompañan"
          subtitle="Marcas, empresas y emprendimientos que hacen posible cada experiencia de Australe."
        />

        <ul className={gridClassName} aria-label="Empresas que nos acompañan">
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const content = (
    <div className="flex h-20 w-full items-center justify-center sm:h-24">
      <RemoteImage
        src={partner.image_url}
        alt={partner.name}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );

  const cardClassName = cn(
    "flex h-full min-h-[7.5rem] items-center justify-center rounded-2xl border bg-transparent p-4 transition",
    "border-[var(--public-border)]/60",
    partner.destination_url
      ? "hover:border-[var(--public-border)] hover:shadow-[0_4px_24px_rgba(155,126,222,0.08)] hover:opacity-95"
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
