"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCommunityInvitationsAction,
  getInviteableEventsAction,
  markInvitationChannelOpenedAction,
} from "@/lib/community/invitations/actions";
import type { InviteableEvent } from "@/lib/community/invitations/types";
import {
  INVITATION_CHANNEL,
  INVITATION_TYPE,
  type InvitationChannel,
  type InvitationType,
} from "@/lib/community/invitations/types";

type AdminCommunityInviteWizardProps = {
  open: boolean;
  userIds: string[];
  onClose: () => void;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function AdminCommunityInviteWizard({
  open,
  userIds,
  onClose,
}: AdminCommunityInviteWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [events, setEvents] = useState<InviteableEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [invitationType, setInvitationType] = useState<InvitationType>(
    INVITATION_TYPE.INFORMATIONAL,
  );
  const [channel, setChannel] = useState<InvitationChannel>(
    INVITATION_CHANNEL.WHATSAPP,
  );
  const [message, setMessage] = useState("");
  const [allowResend, setAllowResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [channelLinks, setChannelLinks] = useState<
    Array<{ id: string; whatsappUrl?: string; mailtoUrl?: string }>
  >([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    void getInviteableEventsAction().then((res) => {
      if (res.success) {
        setEvents(res.events);
      }
    });
  }, [open]);

  if (!open) {
    return null;
  }

  function close() {
    if (!pending) {
      setStep(1);
      setError(null);
      setResultMessage(null);
      setChannelLinks([]);
      setEventId("");
      setMessage("");
      setAllowResend(false);
      onClose();
    }
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await createCommunityInvitationsAction({
        userIds,
        eventId,
        invitationType,
        channel,
        message,
        allowResend,
      });

      if (!result.success && result.created === 0) {
        setError(result.error ?? "No se pudo crear ninguna invitación.");
        return;
      }

      const parts = [
        `${result.created} invitación(es) registrada(s).`,
        result.skippedDuplicate
          ? `${result.skippedDuplicate} omitida(s) por duplicado.`
          : null,
        result.skippedNoChannel
          ? `${result.skippedNoChannel} sin canal disponible.`
          : null,
      ].filter(Boolean);

      setResultMessage(parts.join(" "));
      setChannelLinks(
        result.invitations.map((item) => ({
          id: item.id,
          whatsappUrl: item.whatsappUrl,
          mailtoUrl: item.mailtoUrl,
        })),
      );
      setStep(6);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-wizard-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-wizard-title" className="text-lg font-semibold text-white">
              Invitar a evento
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Paso {step} de 6 · {userIds.length} destinatario(s)
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="text-zinc-400 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {userIds.length === 0 && (
          <p className="mt-4 text-sm text-amber-300">
            Seleccioná al menos un usuario antes de invitar.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {step === 1 && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-zinc-300">Evento</span>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              >
                <option value="">Seleccionar evento…</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ·{" "}
                    {new Date(event.event_date).toLocaleDateString("es-AR")}
                  </option>
                ))}
              </select>
              {events.length === 0 && (
                <span className="text-amber-300">No hay eventos disponibles.</span>
              )}
            </label>
          )}

          {step === 2 && (
            <fieldset className="space-y-2">
              <legend className="text-sm text-zinc-300">Tipo de invitación</legend>
              <label className="flex items-start gap-2 rounded-lg border border-zinc-800 p-3">
                <input
                  type="radio"
                  checked={invitationType === INVITATION_TYPE.INFORMATIONAL}
                  onChange={() => setInvitationType(INVITATION_TYPE.INFORMATIONAL)}
                />
                <span>
                  <span className="block font-medium text-zinc-100">Informativa</span>
                  <span className="text-xs text-zinc-500">
                    Comparte detalles del evento con enlace de seguimiento.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-zinc-800 p-3">
                <input
                  type="radio"
                  checked={invitationType === INVITATION_TYPE.PURCHASE_LINK}
                  onChange={() => setInvitationType(INVITATION_TYPE.PURCHASE_LINK)}
                />
                <span>
                  <span className="block font-medium text-zinc-100">
                    Con enlace de compra
                  </span>
                  <span className="text-xs text-zinc-500">
                    Dirige al evento público para iniciar la compra.
                  </span>
                </span>
              </label>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="space-y-2">
              <legend className="text-sm text-zinc-300">Canal</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={channel === INVITATION_CHANNEL.WHATSAPP}
                  onChange={() => setChannel(INVITATION_CHANNEL.WHATSAPP)}
                />
                WhatsApp (abre conversación, no envío automático)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={channel === INVITATION_CHANNEL.EMAIL}
                  onChange={() => setChannel(INVITATION_CHANNEL.EMAIL)}
                />
                Email (mailto — sin proveedor automático configurado)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={channel === INVITATION_CHANNEL.MANUAL}
                  onChange={() => setChannel(INVITATION_CHANNEL.MANUAL)}
                />
                Manual (solo registro y copia de mensaje)
              </label>
            </fieldset>
          )}

          {step === 4 && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-zinc-300">Mensaje opcional</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                placeholder="Texto personalizado que se incluirá en la invitación…"
              />
            </label>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm text-zinc-300">
              <p>
                <strong className="text-white">Evento:</strong>{" "}
                {events.find((e) => e.id === eventId)?.name ?? "—"}
              </p>
              <p>
                <strong className="text-white">Destinatarios:</strong> {userIds.length}
              </p>
              <p>
                <strong className="text-white">Tipo:</strong> {invitationType}
              </p>
              <p>
                <strong className="text-white">Canal:</strong> {channel}
              </p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowResend}
                  onChange={(e) => setAllowResend(e.target.checked)}
                />
                Permitir reenvío si ya existe invitación activa
              </label>
              {channel === INVITATION_CHANNEL.EMAIL && (
                <p className="text-amber-300">
                  El envío automático por email no está configurado. Se registrará la
                  invitación y podrás abrir mailto: por destinatario.
                </p>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3 text-sm">
              {resultMessage && (
                <p className="text-emerald-300">{resultMessage}</p>
              )}
              {channelLinks.length > 0 && (
                <ul className="space-y-2">
                  {channelLinks.map((link) => (
                    <li key={link.id} className="flex flex-wrap gap-2">
                      {link.whatsappUrl && (
                        <a
                          href={link.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            void markInvitationChannelOpenedAction(link.id);
                          }}
                          className="rounded-md bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-600"
                        >
                          Abrir WhatsApp
                        </a>
                      )}
                      {link.mailtoUrl && (
                        <a
                          href={link.mailtoUrl}
                          className="rounded-md bg-zinc-700 px-3 py-1.5 text-white hover:bg-zinc-600"
                        >
                          Abrir email
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {step > 1 && step < 6 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={pending}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
            >
              Atrás
            </button>
          )}
          {step < 5 && (
            <button
              type="button"
              disabled={
                (step === 1 && !eventId) || userIds.length === 0 || pending
              }
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Siguiente
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              disabled={pending || userIds.length === 0 || !eventId}
              onClick={confirm}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Procesando…" : "Confirmar invitaciones"}
            </button>
          )}
          {step === 6 && (
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
