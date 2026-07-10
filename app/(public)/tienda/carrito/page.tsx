import type { Metadata } from "next";
import { StoreCartPageClient } from "@/components/store/StoreCartPageClient";

export const metadata: Metadata = {
  title: "Carrito · Tienda",
};

export default function TiendaCarritoPage() {
  return <StoreCartPageClient />;
}
