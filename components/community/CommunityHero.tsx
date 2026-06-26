import { PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { CommunitySettings } from "@/lib/community/loyalty/types";

type CommunityHeroProps = {
  settings: CommunitySettings;
  isAuthenticated: boolean;
};

export function CommunityHero({ settings, isAuthenticated }: CommunityHeroProps) {
  return (
    <PublicCard padding="lg" className="mt-8">
      <h2 className="public-heading text-center text-xl font-bold">{settings.public_title}</h2>
      <p className="public-prose-justified mx-auto mt-3 max-w-3xl text-sm public-text-muted">
        {settings.public_description}
      </p>

      {!isAuthenticated ? (
        <>
          <ul className="mt-5 space-y-2 text-sm public-text-soft">
            <li>· Sumá puntos con cada entrada confirmada.</li>
            <li>· Subí de nivel y desbloqueá beneficios.</li>
            <li>· Canjeá recompensas exclusivas.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <PublicButton href={ROUTES.login}>Iniciar sesión</PublicButton>
            <PublicButton href={ROUTES.login} variant="outline">
              Registrarse
            </PublicButton>
          </div>
        </>
      ) : null}
    </PublicCard>
  );
}
