import type { Metadata } from "next";
import { StoreCheckoutClient } from "@/components/store/StoreCheckoutClient";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { isMercadoPagoEnabled } from "@/lib/payments/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Checkout · Tienda",
};

export default async function TiendaCheckoutPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const isCommunityMember = await isActiveCommunityMember(profile?.id);

  return (
    <StoreCheckoutClient
      isLoggedIn={profile !== null}
      isCommunityMember={isCommunityMember}
      defaultName={profile?.full_name}
      defaultEmail={profile ? undefined : undefined}
      mercadoPagoEnabled={isMercadoPagoEnabled()}
    />
  );
}
