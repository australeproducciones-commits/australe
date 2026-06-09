"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TicketTypeForm } from "@/components/tickets/TicketTypeForm";
import {
  deleteTicketTypeAction,
  toggleTicketTypeActiveAction,
  updateTicketTypeFormAction,
} from "@/lib/tickets/actions";
import type { TicketType } from "@/lib/tickets/types";
import {
  formatTicketPrice,
  getStockAvailableLabel,
  ticketTypeToFormInput,
} from "@/lib/tickets/utils";

type TicketTypeCardProps = {
  ticketType: TicketType;
};

export function TicketTypeCard({ ticketType }: TicketTypeCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateAction = updateTicketTypeFormAction.bind(null, ticketType.id);

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

  if (editing) {
    return (
      <TicketTypeForm
        title={`Editar: ${ticketType.name}`}
        initialValues={ticketTypeToFormInput(ticketType)}
        action={updateAction}
        submitLabel="Guardar cambios"
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white">{ticketType.name}</h3>
            <span
              className={
                ticketType.is_active
                  ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"
                  : "rounded-full bg-zinc-500/20 px-3 py-1 text-xs text-zinc-400"
              }
            >
              {ticketType.is_active ? "Activo" : "Inactivo"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-400">
              Orden {ticketType.sort_order}
            </span>
          </div>
          {ticketType.description ? (
            <p className="mt-2 text-sm text-zinc-400">{ticketType.description}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="Precio público" value={formatTicketPrice(ticketType.public_price)} />
        <InfoItem
          label="Precio comunidad"
          value={formatTicketPrice(ticketType.community_price)}
        />
        <InfoItem
          label="Stock total"
          value={
            ticketType.stock_total != null
              ? String(ticketType.stock_total)
              : "Ilimitado"
          }
        />
        <InfoItem label="Stock vendido" value={String(ticketType.stock_sold)} />
        <InfoItem
          label="Stock disponible"
          value={getStockAvailableLabel(ticketType)}
        />
        <InfoItem
          label="Máx. por compra"
          value={String(ticketType.max_per_order)}
        />
      </div>

      {actionError ? (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
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

      {ticketType.stock_sold > 0 ? (
        <p className="text-xs text-zinc-500">
          No se puede eliminar porque ya hay entradas vendidas.
        </p>
      ) : null}
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
