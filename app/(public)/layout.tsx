import { PublicThemeShell } from "@/components/layout/PublicThemeShell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicThemeShell>{children}</PublicThemeShell>;
}
