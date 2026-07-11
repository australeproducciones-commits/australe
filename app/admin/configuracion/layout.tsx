import { AdminConfigNav } from "@/components/site/AdminConfigNav";

export default function AdminConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="border-b border-white/10 px-4 pt-4 sm:px-8">
        <AdminConfigNav />
      </div>
      {children}
    </>
  );
}
