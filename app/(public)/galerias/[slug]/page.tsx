import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryDetailView } from "@/components/gallery/GalleryDetailView";
import {
  getPublishedGalleryEventBySlug,
  getPublishedGalleryItemsByEventId,
} from "@/lib/events/gallery/queries";

type GaleriaDetallePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: GaleriaDetallePageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedGalleryEventBySlug(slug);
  return {
    title: event ? `Galería · ${event.name}` : "Galería",
  };
}

export default async function GaleriaDetallePage({
  params,
}: GaleriaDetallePageProps) {
  const { slug } = await params;
  const event = await getPublishedGalleryEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const items = await getPublishedGalleryItemsByEventId(event.id);

  return <GalleryDetailView event={event} items={items} />;
}
