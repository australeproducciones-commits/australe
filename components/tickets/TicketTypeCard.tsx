"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { TicketTypeForm } from "@/components/tickets/TicketTypeForm";
import {
  deleteTicketTypeAction,
  toggleTicketTypeActiveAction,
  updateTicketTypeFormAction,
} from "@/lib/tickets/actions";
import type { TicketType } from "@/lib/tickets/types";
import {
  formatCommunityPriceLabel,
  formatTicketPrice,
  getStockAvailableLabel,
  ticketTypeToFormInput,
} from "@/lib/tickets/utils";

type TicketTypeCardProps = {
  ticketType: TicketType;
};

export function TicketTypeCard({ ticketType }: TicketTypeCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateAction = updateTicketTypeFormAction.bind(null, ticketType.id);
  const communityLabel = formatCommunityPriceLabel(ticketType.community_price);

  async function handleToggle() {
    setLoading(true);
    setActionError(null);

    const result = await toggleTicketTypeActiveAction(
      ticketType.id,
      !ticketType.is_active,
    );

    setLoading(false);

    if (!result.success) {
      setActionError(result.error ?? "No se pudo cambiar el estado.");
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar el tipo de entrada "${ticketType.name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setLoading(true);
    setActionError(null);

    const result = await deleteTicketTypeAction(ticketType.id);

    setLoading(false);

    if (!result.success) {
      setActionError(result.error ?? "No se pudo eliminar.");
      return;
    }

    router.refresh();
  }

  return (
    <>
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{ticketType.name}</h3>
              <span
                className={
                  ticketType.is_active
                    ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300"
                    : "rounded-full bg-zinc-500/20 px-2 py-0.5 text-[11px] text-zinc-400"
                }
              >
                {ticketType.is_active ? "Activo" : "Inactivo"}
              </span>
              <span className="text-[11px] text-zinc-500">
                Orden {ticketType.sort_order}
              </span>
            </div>
            {ticketType.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                {ticketType.description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              disabled={loading}
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggle}
              disabled={loading}
            >
              {ticketType.is_active ? "Desactivar" : "Activar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={loading || ticketType.stock_sold > 0}
              className="text-red-300 hover:text-red-200"
            >
              Eliminar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Público" value={formatTicketPrice(ticketType.public_price)} />
          {communityLabel ? (
            <Stat label="Comunidad" value={communityLabel} />
          ) : null}
          <Stat
            label="Stock"
            value={
              ticketType.stock_total != null
                ? String(ticketType.stock_total)
                : "∞"
            }
          />
          <Stat label="Vendidas" value={String(ticketType.stock_sold)} />
          <Stat label="Disponible" value={getStockAvailableLabel(ticketType)} />
          <Stat label="Máx." value={String(ticketType.max_per_order)} />
        </div>

        {actionError ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {actionError}
          </p>
        ) : null}

        {ticketType.stock_sold > 0 ? (
          <p className="text-[11px] text-zinc-500">
            No se puede eliminar: hay entradas vendidas o reservadas.
          </p>
        ) : null}
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Editar: ${ticketType.name}`}
      >
        <TicketTypeForm
          title={`Editar: ${ticketType.name}`}
          initialValues={ticketTypeToFormInput(ticketType)}
          action={updateAction}
          submitLabel="Guardar"
          embedded
          showTitle={false}
          hideSuccessMessage
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
