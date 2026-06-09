import type { Metadata } from "next";
import { CustomerTicketsList } from "@/components/ticket-sales/CustomerTicketsList";
import { Button } from "@/components/ui/Button";
import { getProfile } from "@/lib/auth/getProfile";
import { ROUTES } from "@/lib/constants/routes";
import {
  getCustomerTickets,
  hasLinkedCommunityMember,
} from "@/lib/ticket-sales/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mis entradas",
};

export default async function MisEntradasPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const [tickets, hasCommunityLink] = await Promise.all([
    getCustomerTickets(),
    profile ? hasLinkedCommunityMember(profile.id) : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Button href={ROUTES.miCuenta} variant="ghost" size="sm" className="mb-6">
        ← Volver a mi cuenta
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Mis entradas</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Reservas y entradas confirmadas vinculadas a tu cuenta.
        </p>
      </div>

      <CustomerTicketsList
        tickets={tickets}
        hasCommunityLink={hasCommunityLink}
      />
    </div>
  );
}
