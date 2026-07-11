import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreSubNav } from "@/components/store/StoreSubNav";

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="store-theme min-h-full">
      <StoreSubNav />
      <main>{children}</main>
      <StoreFooter />
    </div>
  );
}
