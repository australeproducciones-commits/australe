import { Suspense } from "react";
import { PostLoginAdModal } from "@/components/advertising/PostLoginAdModal";
import { PublicAuthProvider } from "@/components/layout/PublicAuthProvider";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicPartnersFooter } from "@/components/layout/PublicPartnersFooter";
import { PublicAnalyticsTracker } from "@/components/analytics/PublicAnalyticsTracker";
import { StoreShell } from "@/components/store/StoreShell";

type PublicThemeShellProps = {
  children: React.ReactNode;
};

export function PublicThemeShell({ children }: PublicThemeShellProps) {
  return (
    <div className="public-theme flex min-h-screen flex-col">
      <PublicAnalyticsTracker />
      <PublicAuthProvider>
        <PublicHeader />
      </PublicAuthProvider>
      <StoreShell>
        <main className="public-main flex flex-1 flex-col">{children}</main>
      </StoreShell>
      <Suspense fallback={null}>
        <PublicPartnersFooter />
      </Suspense>
      <PostLoginAdModal />
    </div>
  );
}
