import type { Metadata } from "next";
import { StoreCartPageClient } from "@/components/store/StoreCartPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carrito · Tienda Australe",
  description: "Revisá tu selección de merchandising oficial antes de completar la compra.",
};

export default function TiendaCarritoPage() {
  return <StoreCartPageClient />;
}
