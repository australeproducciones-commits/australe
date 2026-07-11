import type { Metadata } from "next";
import { StorePaymentReturnClient } from "@/components/store/StorePaymentReturnClient";

export const metadata: Metadata = {
  title: "Pago exitoso · Tienda",
};

export default async function TiendaPagoExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.pedido?.trim() ?? "";

  if (!orderNumber) {
    return (
      <StorePaymentReturnClient orderNumber="—" variant="success" />
    );
  }

  return <StorePaymentReturnClient orderNumber={orderNumber} variant="success" />;
}
