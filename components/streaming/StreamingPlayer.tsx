import { resolveStreamEmbed } from "@/lib/streaming/utils";
import type { StreamProvider } from "@/lib/streaming/types";
import { cn } from "@/lib/utils/cn";

type StreamingPlayerProps = {
  streamUrl: string | null;
  provider: StreamProvider;
  title: string;
  linkLabel?: string;
  className?: string;
};

export function StreamingPlayer({
  streamUrl,
  provider,
  title,
  linkLabel,
  className,
}: StreamingPlayerProps) {
  const embed = resolveStreamEmbed(streamUrl, provider, linkLabel ?? title);

  if (embed.kind === "unsupported") {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-[var(--public-border)] bg-[var(--public-card-tint)] p-6 text-center text-sm public-text-muted",
          className,
        )}
      >
        {embed.message}
      </div>
    );
  }

  if (embed.kind === "external_link") {
    return (
      <div
        className={cn(
          "flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--public-border)] bg-[var(--public-card)] p-8 text-center",
          className,
        )}
      >
        <p className="text-sm public-text-muted">
          Esta transmisión se abre en una plataforma externa segura.
        </p>
        <a
          href={embed.href}
          target="_blank"
          rel="noopener noreferrer"
          className="public-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
        >
          {embed.label}
        </a>
      </div>
    );
  }

  if (embed.kind === "hls") {
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-[var(--public-border)] bg-black", className)}>
        <video
          className="aspect-video w-full bg-black"
          controls
          playsInline
          preload="metadata"
          title={embed.title}
        >
          <source src={embed.src} type="application/x-mpegURL" />
          Tu navegador no soporta reproducción HLS integrada.{" "}
          <a
            href={embed.src}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Abrí la transmisión en una nueva pestaña
          </a>
          .
        </video>
        <p className="border-t border-[var(--public-border)] bg-[var(--public-card-tint)] px-4 py-2 text-xs public-text-soft">
          HLS: en Safari suele funcionar nativamente. En otros navegadores puede requerir un reproductor dedicado (etapa futura).
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-[var(--public-border)] bg-black shadow-sm", className)}>
      <iframe
        src={embed.src}
        title={embed.title}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
