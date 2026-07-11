import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreProductDetailClient } from "@/components/store/StoreProductDetailClient";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { getSiteUrl } from "@/lib/payments/config";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import {
  getPublicStoreProductBySlug,
  getRelatedPublicStoreProducts,
} from "@/lib/store/queries";
import { getStoreStockAvailable } from "@/lib/store/utils";
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

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  const description =
    product.short_description ??
    product.description?.slice(0, 160) ??
    `Producto oficial de Australe Producciones: ${product.name}`;

  return {
    title: `${product.name} · Tienda Australe`,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.main_image_url ? [{ url: product.main_image_url }] : undefined,
    },
  };
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

  const relatedProducts = await getRelatedPublicStoreProducts(
    product.id,
    product.category,
  );

  const stock = getStoreStockAvailable(product);
  const availability =
    stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? product.description,
    image: product.main_image_url ? [product.main_image_url] : undefined,
    brand: {
      "@type": "Brand",
      name: "Australe Producciones",
    },
    offers: {
      "@type": "Offer",
      url: `${getSiteUrl()}/tienda/${product.slug}`,
      priceCurrency: "ARS",
      price: product.display_price,
      availability,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <StoreProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
        eventSlug={event?.slug ?? null}
        isCommunityMember={isCommunityMember}
      />
    </>
  );
}
