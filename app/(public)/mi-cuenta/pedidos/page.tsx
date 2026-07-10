import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer, PublicCard } from "@/components/ui/public";
import { getProfile } from "@/lib/auth/getProfile";
import { ROUTES } from "@/lib/constants/routes";
import { getUserStoreOrders } from "@/lib/store/queries";
import { formatStorePrice } from "@/lib/store/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mis pedidos",
};

export default async function MiCuentaPedidosPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.miCuentaPedidos)}`);
  }

  const orders = await getUserStoreOrders(profile.id);

  return (
    <PageContainer>
      <h1 className="public-heading text-3xl font-black">Mis pedidos de tienda</h1>
      <p className="mt-2 text-sm public-text-muted">
        Seguimiento de tus compras de merchandising.
      </p>

      {orders.length === 0 ? (
        <PublicCard padding="lg" className="mt-8 text-center">
          <p className="public-text-muted">Todavía no tenés pedidos de tienda.</p>
          <Link href={ROUTES.tienda} className="mt-4 inline-block text-sm underline">
            Ir a la tienda
          </Link>
        </PublicCard>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <PublicCard key={order.id} padding="md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.order_number}</p>
                  <p className="text-sm public-text-muted">
                    {formatStorePrice(order.total)} · {order.status}
                  </p>
                </div>
                <Link
                  href={ROUTES.miCuentaPedido(order.id)}
                  className="text-sm underline"
                >
                  Ver detalle
                </Link>
              </div>
            </PublicCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
