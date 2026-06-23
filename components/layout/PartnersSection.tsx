"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { recordPartnerClickAction, recordPartnerViewAction } from "@/lib/site/actions";
import type { Partner } from "@/lib/site/types";
import { SectionHeading } from "@/components/ui/public/SectionHeading";

type PartnersSectionProps = {
  partners: Partner[];
};

export function PartnersSection({ partners }: PartnersSectionProps) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <section
      className="border-t py-10 sm:py-12"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg-section)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          label="Alianzas"
          title="Partners"
          subtitle="Marcas que acompañan nuestras experiencias"
          className="text-center"
        />

        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  useEffect(() => {
    void recordPartnerViewAction(partner.id);
  }, [partner.id]);

  const content = (
    <>
      <div className="relative h-20 w-full sm:h-24">
        <RemoteImage
          src={partner.image_url}
          alt={partner.name}
          fill
          className="p-2"
        />
      </div>
      {partner.label ? (
        <p className="mt-2 text-center text-xs uppercase tracking-wide public-text-soft">
          {partner.label}
        </p>
      ) : null}
    </>
  );

  const cardClassName =
    "rounded-2xl border p-4 transition hover:shadow-md public-card";

  if (partner.destination_url) {
    return (
      <li>
        <Link
          href={partner.destination_url}
          target={partner.open_in_new_tab ? "_blank" : undefined}
          rel={partner.open_in_new_tab ? "noopener noreferrer" : undefined}
          className={cardClassName}
          onClick={() => {
            void recordPartnerClickAction(partner.id);
          }}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={cardClassName}>{content}</div>
    </li>
  );
}
