import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import type { StaffAccessibleEvent } from "@/lib/users/queries";

type StaffOperationalPanelProps = {
  panelTitle: string;
  panelDescription: string;
  userName: string;
  events: StaffAccessibleEvent[];
  selectedEventId?: string | null;
  basePath: string;
  emptyMessage: string;
  links?: Array<{
    href: string;
    label: string;
  }>;
  showAdminUsersHint?: boolean;
};

export function StaffOperationalPanel({
  panelTitle,
  panelDescription,
  userName,
  events,
  selectedEventId,
  basePath,
  emptyMessage,
  links = [],
  showAdminUsersHint = false,
}: StaffOperationalPanelProps) {
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  return (
    <div className="px-4 py-8 sm:px-8">
      <div className="mb-8">
        <p className="text-sm text-zinc-400">Operador</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{panelTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">{panelDescription}</p>
        <p className="mt-4 text-sm text-zinc-300">
          Sesión: <span className="font-medium text-zinc-100">{userName}</span>
        </p>
      </div>

      {events.length === 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5 p-6">
          <p className="text-sm text-amber-100">{emptyMessage}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {showAdminUsersHint ? (
              <>
                Podés asignar eventos desde{" "}
                <Link href={ROUTES.adminUsuarios} className="text-purple-300 underline">
                  Usuarios
                </Link>
                .
              </>
            ) : (
              "Contactá a un administrador para que te asigne eventos."
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {events.length > 1 ? (
            <Card className="p-4">
              <label
                htmlFor="staff-event-select"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Evento activo
              </label>
              <div className="flex flex-wrap gap-2">
                {events.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;
                  const href =
                    event.id === events[0]?.id
                      ? basePath
                      : `${basePath}?evento=${encodeURIComponent(event.id)}`;

                  return (
                    <Link
                      key={event.id}
                      href={href}
                      className={
                        isSelected
                          ? "rounded-full border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-medium text-purple-100"
                          : "rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                      }
                    >
                      {event.name}
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {selectedEvent ? (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-zinc-50">
                {selectedEvent.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Fecha: {selectedEvent.event_date} · Estado: {selectedEvent.status}
              </p>
              <p className="mt-4 text-sm text-zinc-400">
                Panel operativo listo. Las funciones de venta en mostrador y
                validación QR se habilitarán en una etapa posterior.
              </p>
            </Card>
          ) : null}
        </div>
      )}

      {links.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
