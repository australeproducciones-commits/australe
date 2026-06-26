import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminEventGalleryPanel } from "@/components/gallery/AdminEventGalleryPanel";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { canHaveGallery } from "@/lib/events/contentRules";
import { getAdminGalleryItemsByEventId } from "@/lib/events/gallery/queries";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { isUuid } from "@/lib/events/adminRoutes";

type AdminEventGaleriaPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminEventGaleriaPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Admin · Galería" };
  const event = await getEventByIdForAdmin(id);
  return { title: event ? `Admin · Galería · ${event.name}` : "Admin · Galería" };
}

export default async function AdminEventGaleriaPage({
  params,
}: AdminEventGaleriaPageProps) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const event = await getEventByIdForAdmin(id);

  if (!event) {
    notFound();
  }

  if (!canHaveGallery(event)) {
    notFound();
  }

  const items = await getAdminGalleryItemsByEventId(event.id);

  return (
    <>
      <AdminHeader
        title="Galería del evento"
        description={`Administrá fotos y videos de ${event.name}.`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <Button href={ROUTES.adminEvento(event.id)} variant="ghost" size="sm">
            ← Volver al evento
          </Button>
          <Button href={ROUTES.galeria(event.slug)} variant="outline" size="sm">
            Ver galería pública
          </Button>
        </div>
        <AdminEventGalleryPanel eventId={event.id} items={items} />
      </div>
    </>
  );
}
