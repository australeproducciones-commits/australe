import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerTicketsByStatus } from "@/app/(public)/mi-cuenta/_components/CustomerTicketsByStatus";
import { MiCuentaAuthBar } from "@/components/auth/MiCuentaAuthBar";
import { Button } from "@/components/ui/Button";
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Button href={ROUTES.home} variant="ghost" size="sm" className="mb-6">
        ← Volver al inicio
      </Button>

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
          Mi cuenta
        </p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          Tus entradas
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Reservas, entradas confirmadas y códigos QR para ingresar al evento.
        </p>
      </div>

      <MiCuentaAuthBar />

      <div className="mb-6 flex flex-wrap gap-3">
        <Button href={ROUTES.eventos} variant="outline" size="sm">
          Ver eventos
        </Button>
        <Button href={ROUTES.comunidad} variant="ghost" size="sm">
          Comunidad
        </Button>
      </div>

      <CustomerTicketsByStatus tickets={tickets} />
    </div>
  );
}
