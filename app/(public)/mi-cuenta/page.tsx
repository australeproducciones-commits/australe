import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerTicketsByStatus } from "@/app/(public)/mi-cuenta/_components/CustomerTicketsByStatus";
import { MiCuentaAuthBar } from "@/components/auth/MiCuentaAuthBar";
import {
  PageContainer,
  PublicButton,
  SectionHeading,
} from "@/components/ui/public";
import { getProfile } from "@/lib/auth/getProfile";
import { ROUTES } from "@/lib/constants/routes";
import { getCustomerTickets } from "@/lib/ticket-sales/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

export default async function MiCuentaPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    redirect(ROUTES.login);
  }

  const tickets = await getCustomerTickets();

  return (
    <PageContainer size="sm">
      <PublicButton href={ROUTES.home} variant="ghost" size="sm" className="mb-6">
        ← Volver al inicio
      </PublicButton>

      <SectionHeading
        label="Mi cuenta"
        title="Tus entradas"
        subtitle="Reservas, entradas confirmadas y códigos QR para ingresar al evento."
        className="mb-8"
      />

      <MiCuentaAuthBar />

      <div className="mb-6 flex flex-wrap gap-3">
        <PublicButton href={ROUTES.eventos} variant="outline" size="sm">
          Ver eventos
        </PublicButton>
        <PublicButton href={ROUTES.comunidad} variant="ghost" size="sm">
          Comunidad
        </PublicButton>
      </div>

      <CustomerTicketsByStatus tickets={tickets} />
    </PageContainer>
  );
}
