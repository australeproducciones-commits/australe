import { AdminStreamingForm } from "@/components/streaming/AdminStreamingForm";
import { StreamingBadge } from "@/components/streaming/StreamingBadge";
import { Card } from "@/components/ui/Card";
import { formatStreamDateTime } from "@/lib/streaming/utils";
import type { EventStream } from "@/lib/streaming/types";

type AdminStreamingPanelProps = {
  eventId: string;
  eventSlug: string;
  streams: EventStream[];
};

export function AdminStreamingPanel({
  eventId,
  eventSlug,
  streams,
}: AdminStreamingPanelProps) {
  const primary = streams[0] ?? null;

  return (
    <div className="space-y-6">
      {primary ? (
        <Card padding="sm" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-white">Estado actual</h2>
            <StreamingBadge status={primary.status} />
            {primary.is_enabled ? (
              <span className="text-xs text-green-300">Habilitado</span>
            ) : (
              <span className="text-xs text-zinc-400">Deshabilitado</span>
            )}
          </div>
          <p className="text-sm text-zinc-300">
            Inicio: {formatStreamDateTime(primary.starts_at)}
          </p>
          {primary.ends_at ? (
            <p className="text-sm text-zinc-400">
              Fin estimado: {formatStreamDateTime(primary.ends_at)}
            </p>
          ) : null}
        </Card>
      ) : (
        <Card padding="sm">
          <p className="text-sm text-zinc-400">
            Todavía no hay una transmisión configurada para este evento.
          </p>
        </Card>
      )}

      <AdminStreamingForm eventId={eventId} eventSlug={eventSlug} stream={primary} />

      {streams.length > 1 ? (
        <Card padding="sm">
          <p className="text-sm text-zinc-400">
            Este evento tiene {streams.length} transmisiones registradas. En esta etapa se edita la más reciente.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
