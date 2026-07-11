import type { Metadata } from "next";
import { StoreCheckoutClient } from "@/components/store/StoreCheckoutClient";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { getStoreCheckoutPaymentAvailability } from "@/lib/payments/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Checkout · Tienda Australe",
  description: "Completá tu compra de merchandising oficial de Australe Producciones.",
};

export default async function TiendaCheckoutPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const isCommunityMember = await isActiveCommunityMember(profile?.id);
  const paymentAvailability = getStoreCheckoutPaymentAvailability();

  return (
    <StoreCheckoutClient
      isLoggedIn={profile !== null}
      isCommunityMember={isCommunityMember}
      defaultName={profile?.full_name}
      defaultEmail={profile ? undefined : undefined}
      paymentAvailability={paymentAvailability}
    />
  );
}
