import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type StoreProductImageFallbackProps = {
  name: string;
  className?: string;
  compact?: boolean;
};

export function StoreProductImageFallback({
  name,
  className,
  compact = false,
}: StoreProductImageFallbackProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--public-card-tint)] text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border font-bold text-[var(--public-primary-hover)]",
          compact ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl",
        )}
        style={{ borderColor: "var(--public-border)" }}
        aria-hidden
      >
        {initial}
      </div>
      {!compact ? (
        <div className="px-4">
          <Image
            src="/images/logob.png"
            alt="Australe Producciones"
            width={120}
            height={32}
            className="mx-auto h-6 w-auto opacity-70"
          />
          <p className="mt-2 text-xs public-text-muted">Imagen próximamente</p>
        </div>
      ) : null}
    </div>
  );
}
