"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cancelKioskOrderAction } from "@/lib/kiosk/actions";
import type { KioskOrder } from "@/lib/kiosk/types";
import { adminInputClassName } from "@/lib/utils/adminFormStyles";

type CancelKioskOrderModalProps = {
  order: KioskOrder | null;
  eventId: string;
  onClose: () => void;
};

export function CancelKioskOrderModal({
  order,
  eventId,
  onClose,
}: CancelKioskOrderModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!order) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await cancelKioskOrderAction(order.id, eventId, reason);

    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setReason("");
    onClose();
    router.refresh();
  }

  function handleClose() {
    setReason("");
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={Boolean(order)}
      onClose={handleClose}
      title={order ? `Cancelar ${order.order_code}` : "Cancelar orden"}
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          Al cancelar esta orden, se liberará el stock de los productos incluidos.
          Esta acción no debe usarse para órdenes ya entregadas.
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Motivo (opcional)
          </span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={adminInputClassName}
            placeholder="Ej. cliente desistió"
          />
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={handleConfirm}
          >
            Cancelar orden
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleClose}>
            Volver
          </Button>
        </div>
      </div>
    </Modal>
  );
}
