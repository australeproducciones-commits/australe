import { FeaturedEventPromoBar } from "@/components/home/FeaturedEventPromoBar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getFeaturedPublishedEvents } from "@/lib/events/queries";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const featuredEvents = await getFeaturedPublishedEvents();

  return (
    <div className="public-theme flex min-h-screen flex-col">
      <FeaturedEventPromoBar events={featuredEvents} />
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
