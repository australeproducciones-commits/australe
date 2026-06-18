import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import { formatKioskMoney, getKioskStockAvailable } from "@/lib/kiosk/utils";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";

type EventSalesQrPriceListProps = {
  products: PublicEventKioskProduct[];
};

export function EventSalesQrPriceList({ products }: EventSalesQrPriceListProps) {
  if (products.length === 0) {
    return (
      <PublicCard padding="lg" className="text-center">
        <h2 className="public-heading text-lg font-bold">Lista de precios</h2>
        <p className="mt-2 text-sm public-text-muted">
          Todavía no hay productos habilitados para este evento.
        </p>
      </PublicCard>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeading label="Consumiciones" title="Lista de precios" />

      <PublicCard padding="sm" className="overflow-hidden p-0">
        <ul className="divide-y" style={{ borderColor: "var(--public-border)" }}>
          {products.map((product) => {
            const stock = getKioskStockAvailable(product);

            return (
              <li
                key={product.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: "var(--public-border)" }}
              >
                <div className="min-w-0">
                  <p className="public-heading font-semibold">{product.product_name}</p>
                  {product.product_category ? (
                    <p className="text-xs uppercase tracking-wider public-text-soft">
                      {product.product_category}
                    </p>
                  ) : null}
                  {product.product_description ? (
                    <p className="mt-1 text-sm public-text-muted">
                      {product.product_description}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="public-label text-lg font-bold">
                    {formatKioskMoney(product.price)}
                  </p>
                  {stock != null ? (
                    <p className="text-xs public-text-soft">
                      {stock > 0 ? `${stock} disponibles` : "Agotado"}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </PublicCard>
    </section>
  );
}
