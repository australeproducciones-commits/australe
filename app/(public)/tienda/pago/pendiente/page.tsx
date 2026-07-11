import type { Metadata } from "next";
import { StorePaymentReturnClient } from "@/components/store/StorePaymentReturnClient";

export const metadata: Metadata = {
  title: "Pago pendiente · Tienda",
};

export default async function TiendaPagoPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.pedido?.trim() ?? "";

  return (
    <StorePaymentReturnClient
      orderNumber={orderNumber || "—"}
      variant="pending"
    />
  );
}
