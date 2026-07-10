import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin · Publicidad",
};

export default function AdminPublicidadRedirectPage() {
  redirect("/admin/comunidad/publicidad");
}
