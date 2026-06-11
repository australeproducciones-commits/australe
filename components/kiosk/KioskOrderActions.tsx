"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  markKioskOrderDeliveredAction,
  markKioskOrderPaidAction,
  markKioskOrderReadyAction,
} from "@/lib/kiosk/actions";
import type { KioskOrder } from "@/lib/kiosk/types";
import {
  canCancelKioskOrder,
  canMarkKioskOrderDelivered,
  canMarkKioskOrderPaid,
  canMarkKioskOrderReady,
  isKioskOrderCancelled,
  isKioskOrderDelivered,
} from "@/lib/kiosk/utils";
import { cn } from "@/lib/utils/cn";

type KioskOrderActionsProps = {
  order: KioskOrder;
  eventId: string;
  onCancel: () => void;
  onView?: () => void;
  compact?: boolean;
};

export function KioskOrderActions({
  order,
  eventId,
  onCancel,
  onView,
  compact = false,
}: KioskOrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    action: () => Promise<{ ok: boolean; message: string }>,
  ) {
    setLoading(true);
    setError(null);
    const result = await action();
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  if (isKioskOrderCancelled(order)) {
    return (
      <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-[11px] text-zinc-400">
        Cancelada
      </span>
    );
  }

  if (isKioskOrderDelivered(order)) {
    return (
      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">
        Entregada
      </span>
    );
  }

  const size = compact ? "sm" : "sm";

  return (
    <div className={cn("space-y-1", compact && "flex flex-wrap gap-1 space-y-0")}>
      <div className={cn("flex flex-wrap gap-1", compact && "justify-end")}>
        {onView ? (
          <Button type="button" variant="ghost" size={size} onClick={onView}>
            Ver
          </Button>
        ) : null}
        {canMarkKioskOrderPaid(order) ? (
          <Button
            type="button"
            size={size}
            disabled={loading}
            onClick={() =>
              runAction(() => markKioskOrderPaidAction(order.id, eventId))
            }
          >
            Marcar pagada
          </Button>
        ) : null}
        {canMarkKioskOrderReady(order) ? (
          <Button
            type="button"
            size={size}
            variant="outline"
            disabled={loading}
            onClick={() =>
              runAction(() => markKioskOrderReadyAction(order.id, eventId))
            }
          >
            Lista
          </Button>
        ) : null}
        {canMarkKioskOrderDelivered(order) ? (
          <Button
            type="button"
            size={size}
            variant="secondary"
            disabled={loading}
            onClick={() =>
              runAction(() => markKioskOrderDeliveredAction(order.id, eventId))
            }
          >
            Entregar
          </Button>
        ) : null}
        {canCancelKioskOrder(order) ? (
          <Button
            type="button"
            size={size}
            variant="ghost"
            disabled={loading}
            className="text-red-300 hover:text-red-200"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-[11px] text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
