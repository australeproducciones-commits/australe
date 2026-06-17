import { Card } from "@/components/ui/Card";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import { formatKioskMoney, getKioskStockAvailable } from "@/lib/kiosk/utils";

type EventSalesQrPriceListProps = {
  products: PublicEventKioskProduct[];
};

export function EventSalesQrPriceList({ products }: EventSalesQrPriceListProps) {
  if (products.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <h2 className="text-lg font-bold text-white">Lista de precios</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Todavía no hay productos habilitados para este evento.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-300">
          Consumiciones
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">Lista de precios</h2>
      </div>

      <Card padding="sm" className="overflow-hidden p-0">
        <ul className="divide-y divide-white/10">
          {products.map((product) => {
            const stock = getKioskStockAvailable(product);

            return (
              <li
                key={product.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white">{product.product_name}</p>
                  {product.product_category ? (
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      {product.product_category}
                    </p>
                  ) : null}
                  {product.product_description ? (
                    <p className="mt-1 text-sm text-zinc-400">
                      {product.product_description}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-purple-200">
                    {formatKioskMoney(product.price)}
                  </p>
                  {stock != null ? (
                    <p className="text-xs text-zinc-500">
                      {stock > 0 ? `${stock} disponibles` : "Agotado"}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
