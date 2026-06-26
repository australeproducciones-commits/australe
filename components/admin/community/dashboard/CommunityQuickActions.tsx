import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const ACTIONS = [
  {
    href: ROUTES.adminComunidadUsuarios,
    label: "Ver usuarios",
    hint: "Padrón y perfiles",
    accent: "from-sky-500/15 to-sky-500/5 border-sky-400/25 text-sky-100",
  },
  {
    href: `${ROUTES.adminComunidadRecompensas}#crear`,
    label: "Crear recompensa",
    hint: "Catálogo de canje",
    accent: "from-purple-500/15 to-purple-500/5 border-purple-400/25 text-purple-100",
  },
  {
    href: `${ROUTES.adminComunidadUsuarios}?invite=1`,
    label: "Invitar usuarios",
    hint: "Flujo de invitación",
    accent: "from-violet-500/15 to-violet-500/5 border-violet-400/25 text-violet-100",
  },
  {
    href: ROUTES.adminComunidadPublicidad,
    label: "Crear publicidad",
    hint: "Campañas activas",
    accent: "from-cyan-500/15 to-cyan-500/5 border-cyan-400/25 text-cyan-100",
  },
] as const;

export function CommunityQuickActions() {
  return (
    <nav
      aria-label="Acciones rápidas de comunidad"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
    >
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group rounded-xl border bg-gradient-to-br px-4 py-3 transition",
            "hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400",
            action.accent,
          )}
        >
          <span className="block text-sm font-semibold">{action.label}</span>
          <span className="mt-0.5 block text-[11px] opacity-75">{action.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
