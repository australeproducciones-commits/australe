import Link from "next/link";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

export function CommunityEventGate() {
  return (
    <PageContainer>
      <PublicCard padding="lg" className="mx-auto max-w-lg text-center">
        <SectionHeading
          label="Comunidad"
          title="Evento exclusivo para la comunidad"
          subtitle="Este evento está disponible para miembros de la comunidad Australe."
          titleClassName="mt-3"
        />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PublicButton href={ROUTES.login}>Ingresar</PublicButton>
          <PublicButton href={ROUTES.comunidad} variant="outline">
            Sumarme a la comunidad
          </PublicButton>
        </div>
        <p className="mt-6 text-sm public-text-soft">
          ¿Ya sos parte de la comunidad?{" "}
          <Link href={ROUTES.login} className="public-link font-semibold">
            Iniciá sesión
          </Link>{" "}
          con la cuenta vinculada a tu membresía.
        </p>
      </PublicCard>
    </PageContainer>
  );
}
