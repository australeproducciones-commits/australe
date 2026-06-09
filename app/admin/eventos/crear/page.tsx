import type { Metadata } from "next";
import { AdminCreateEventView } from "@/components/events/AdminCreateEventView";

export const metadata: Metadata = {
  title: "Admin · Crear evento",
};

export default function AdminCrearEventoPage() {
  return <AdminCreateEventView />;
}
