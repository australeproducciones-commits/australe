import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Comunidad",
};

export default function AdminComunidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
