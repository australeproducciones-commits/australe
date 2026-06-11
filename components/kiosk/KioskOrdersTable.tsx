"use client";

import { useMemo, useState } from "react";
import { CancelKioskOrderModal } from "@/components/kiosk/CancelKioskOrderModal";
import { KioskOrderActions } from "@/components/kiosk/KioskOrderActions";
import { KioskOrderDetailModal } from "@/components/kiosk/KioskOrderDetailModal";
import { Card } from "@/components/ui/Card";
import type { KioskOrder, KioskOrderItem } from "@/lib/kiosk/types";
import {
  countKioskOrdersByFilter,
  filterKioskOrders,
  formatKioskMoney,
  getKioskOrdersSummary,
  getKioskOrderSourceLabel,
  getKioskPaymentStatusLabel,
  getKioskPickupStatusLabel,
  KIOSK_ORDER_FILTERS,
  type KioskOrderFilter,
} from "@/lib/kiosk/utils";
import { adminInputClassName } from "@/lib/utils/adminFormStyles";
import { cn } from "@/lib/utils/cn";

type KioskOrdersTableProps = {
  eventId: string;
  orders: KioskOrder[];
  orderItems: KioskOrderItem[];
};

export function KioskOrdersTable({
  eventId,
  orders,
  orderItems,
}: KioskOrdersTableProps) {
  const [filter, setFilter] = useState<KioskOrderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewOrder, setViewOrder] = useState<KioskOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<KioskOrder | null>(null);

  const ordersSummary = useMemo(() => getKioskOrdersSummary(orders), [orders]);

  const filteredOrders = useMemo(
    () => filterKioskOrders(orders, filter, searchQuery),
    [orders, filter, searchQuery],
  );

  const isFiltered = filter !== "all" || searchQuery.trim().length > 0;

  return (
    <>
      <Card padding="sm" className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
          Órdenes de consumisiones
        </h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Órdenes" value={String(ordersSummary.totalOrders)} />
          <MiniStat
            label="Recaudado pagado"
            value={formatKioskMoney(ordersSummary.paidRevenue)}
          />
          <MiniStat
            label="Pendiente de pago"
            value={String(ordersSummary.pendingPaymentOrders)}
          />
          <MiniStat
            label="Pendiente de entrega"
            value={String(ordersSummary.pendingPickupOrders)}
          />
        </div>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por código, comprador, contacto, email o entrada…"
          className={adminInputClassName}
        />

        <div className="flex flex-wrap gap-2">
          {KIOSK_ORDER_FILTERS.map((option) => {
            const count = countKioskOrdersByFilter(orders, option.id);
            const active = filter === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-purple-500 text-white"
                    : "bg-white/10 text-zinc-300 hover:bg-white/15",
                )}
              >
                {option.label}
                <span
                  className={cn(
                    "ml-1.5",
                    active ? "text-purple-100" : "text-zinc-500",
                  )}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no hay órdenes de kiosco para este evento.
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay órdenes con estos filtros.
          </p>
        ) : (
          <>
            {isFiltered ? (
              <p className="text-xs text-zinc-500">
                {filteredOrders.length} de {orders.length} órdenes
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-2 font-medium">Código</th>
                    <th className="px-2 py-2 font-medium">Comprador</th>
                    <th className="px-2 py-2 font-medium">Contacto</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                    <th className="px-2 py-2 font-medium">Pago</th>
                    <th className="px-2 py-2 font-medium">Retiro</th>
                    <th className="px-2 py-2 font-medium">Origen</th>
                    <th className="px-2 py-2 font-medium">Fecha</th>
                    <th className="px-2 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/5 text-zinc-300"
                    >
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs text-purple-200">
                            {order.order_code}
                          </span>
                          {order.ticket_id ? (
                            <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] text-sky-200">
                              Con entrada
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2">{order.buyer_name}</td>
                      <td className="px-2 py-2 text-xs text-zinc-500">
                        {order.buyer_whatsapp || order.buyer_dni || "—"}
                      </td>
                      <td className="px-2 py-2 font-semibold text-white">
                        {formatKioskMoney(order.total_amount)}
                      </td>
                      <td className="px-2 py-2">
                        {getKioskPaymentStatusLabel(order.payment_status)}
                      </td>
                      <td className="px-2 py-2">
                        {getKioskPickupStatusLabel(order.pickup_status)}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {getKioskOrderSourceLabel(order.source)}
                      </td>
                      <td className="px-2 py-2 text-xs text-zinc-500">
                        {new Intl.DateTimeFormat("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(order.created_at))}
                      </td>
                      <td className="px-2 py-2 min-w-[200px]">
                        <KioskOrderActions
                          order={order}
                          eventId={eventId}
                          compact
                          onView={() => setViewOrder(order)}
                          onCancel={() => setCancelOrder(order)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <KioskOrderDetailModal
        order={viewOrder}
        items={orderItems}
        eventId={eventId}
        onClose={() => setViewOrder(null)}
        onCancel={(order) => {
          setViewOrder(null);
          setCancelOrder(order);
        }}
      />

      <CancelKioskOrderModal
        order={cancelOrder}
        eventId={eventId}
        onClose={() => setCancelOrder(null)}
      />
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
