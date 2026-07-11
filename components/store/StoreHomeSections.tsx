import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

export function StoreEmotionalBlock() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--public-border)]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 30% 50%, var(--store-glow), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
            Más que merchandising
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            No es solo merchandising
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--public-text-secondary)] sm:text-lg">
            Cada producto representa una noche, una canción, un encuentro y una
            historia compartida. Formá parte de Australe dentro y fuera de cada
            evento.
          </p>
          <PublicButton
            href={`${ROUTES.tienda}#catalogo`}
            variant="primary"
            className="mt-8"
          >
            Ver colección oficial
          </PublicButton>
        </div>
      </div>
    </section>
  );
}

export function StoreFinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
      <div
        className="rounded-2xl border px-6 py-12 text-center sm:px-10 sm:py-14"
        style={{
          borderColor: "var(--public-border)",
          background:
            "linear-gradient(180deg, var(--public-card-tint) 0%, var(--public-card) 100%)",
        }}
      >
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tu próximo favorito está acá
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--public-text-secondary)] sm:text-base">
          Descubrí la colección oficial de Australe y elegí el producto que te va
          a acompañar en la próxima experiencia.
        </p>
        <PublicButton
          href={`${ROUTES.tienda}#catalogo`}
          variant="primary"
          size="lg"
          className="mt-8"
        >
          Explorar toda la tienda
        </PublicButton>
      </div>
    </section>
  );
}
