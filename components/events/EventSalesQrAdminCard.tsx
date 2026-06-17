"use client";

import { useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { getAbsoluteSalesQrUrl } from "@/lib/events/salesQr";
import { cn } from "@/lib/utils/cn";

type EventSalesQrAdminCardProps = {
  event: Event;
};

export function EventSalesQrAdminCard({ event }: EventSalesQrAdminCardProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const path =
    event.sales_qr_url ||
    (event.sales_qr_code ? ROUTES.ventaEvento(event.sales_qr_code) : null);

  const absoluteUrl = useMemo(() => {
    if (!path) {
      return null;
    }

    if (typeof window !== "undefined") {
      return getAbsoluteSalesQrUrl(path, window.location.origin);
    }

    return getAbsoluteSalesQrUrl(path);
  }, [path]);

  async function copyLink() {
    if (!absoluteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !absoluteUrl) {
      return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-ventas-${event.slug || event.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card padding="sm" className="mb-6 border-emerald-400/20 bg-emerald-400/5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-white">QR de ventas del evento</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Un único QR para entradas, lista de precios y consumiciones según
            lo que actives en el formulario.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge
              active={event.sales_qr_enabled}
              label={event.sales_qr_enabled ? "Activo" : "Inactivo"}
            />
            <FeatureBadge active={event.qr_sell_tickets} label="Entradas QR" />
            <FeatureBadge
              active={event.qr_products_enabled}
              label="Productos QR"
            />
            <FeatureBadge
              active={event.qr_show_price_list}
              label="Lista de precios"
            />
            <FeatureBadge
              active={event.qr_sell_products}
              label="Venta consumiciones"
            />
          </div>

          {path ? (
            <p className="mt-4 break-all text-sm text-zinc-300">
              <span className="text-zinc-500">Link: </span>
              {absoluteUrl ?? path}
            </p>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Activá al menos una opción del checklist y guardá el evento para
              generar el código.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!absoluteUrl}
              onClick={copyLink}
            >
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!absoluteUrl}
              href={absoluteUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir QR
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!absoluteUrl}
              onClick={downloadQr}
            >
              Descargar QR
            </Button>
          </div>
        </div>

        {absoluteUrl ? (
          <div
            ref={qrRef}
            className="mx-auto shrink-0 rounded-2xl bg-white p-4 shadow-lg lg:mx-0"
          >
            <QRCode value={absoluteUrl} size={160} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function StatusBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        active
          ? "bg-emerald-400/15 text-emerald-200"
          : "bg-zinc-800 text-zinc-400",
      )}
    >
      {label}
    </span>
  );
}

function FeatureBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  if (!active) {
    return null;
  }

  return (
    <span className="rounded-full bg-purple-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-200">
      {label}
    </span>
  );
}
