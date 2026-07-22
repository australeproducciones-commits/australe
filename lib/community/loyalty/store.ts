import { createAdminClient } from "@/lib/supabase/admin";

export async function awardLoyaltyPointsForStoreOrder(
  orderId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("award_loyalty_points_for_store_order", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("awardLoyaltyPointsForStoreOrder:", error.message);
    return null;
  }

  try {
    const { data: order } = await admin
      .from("store_orders")
      .select("user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (order?.user_id) {
      const { processAutomaticGiveawayEntries } = await import(
        "@/lib/community/giveaways/service"
      );
      await processAutomaticGiveawayEntries({
        userId: order.user_id,
        sourceType: "store_purchase",
        sourceReferenceId: orderId,
      });
    }
  } catch (giveawayError) {
    console.error("awardLoyaltyPointsForStoreOrder giveaways:", giveawayError);
  }

  return (data as string | null) ?? null;
}

export async function reverseLoyaltyPointsForStoreOrder(
  orderId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reverse_loyalty_points_for_store_order", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("reverseLoyaltyPointsForStoreOrder:", error.message);
    return null;
  }

  return (data as string | null) ?? null;
}
