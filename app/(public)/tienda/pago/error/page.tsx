import type { Metadata } from "next";
import { StorePaymentReturnClient } from "@/components/store/StorePaymentReturnClient";

export const metadata: Metadata = {
  title: "Error de pago · Tienda",
};

export default async function TiendaPagoErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.pedido?.trim() ?? "";

  return (
    <StorePaymentReturnClient
      orderNumber={orderNumber || "—"}
      variant="error"
    />
  );
}
