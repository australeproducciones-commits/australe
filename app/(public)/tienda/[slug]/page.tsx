import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreProductDetailClient } from "@/components/store/StoreProductDetailClient";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getPublicStoreProductBySlug } from "@/lib/store/queries";
import { createClient } from "@/lib/supabase/server";

type TiendaProductoPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ evento?: string }>;
};

export async function generateMetadata({
  params,
}: TiendaProductoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicStoreProductBySlug(slug);
  return { title: product?.name ?? "Producto" };
}

export default async function TiendaProductoPage({
  params,
  searchParams,
}: TiendaProductoPageProps) {
  const { slug } = await params;
  const { evento } = await searchParams;
  const event = evento ? await getPublishedEventBySlug(evento) : null;

  const product = await getPublicStoreProductBySlug(slug, event?.id ?? null);
  if (!product) {
    notFound();
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const isCommunityMember = await isActiveCommunityMember(profile?.id);

  if (product.community_only && !isCommunityMember) {
    notFound();
  }

  return (
    <StoreProductDetailClient
      product={product}
      eventSlug={event?.slug ?? null}
      isCommunityMember={isCommunityMember}
    />
  );
}
