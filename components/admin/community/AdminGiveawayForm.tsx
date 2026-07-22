"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveGiveawayAction } from "@/lib/community/giveaways/admin-actions";
import type { CommunityGiveaway, GiveawayEntryType } from "@/lib/community/giveaways/types";
import { slugifyGiveawayName } from "@/lib/community/giveaways/utils";
import { ROUTES } from "@/lib/constants/routes";

const ENTRY_TYPES: GiveawayEntryType[] = [
  "free",
  "points",
  "ticket",
  "attendance",
  "store_purchase",
  "automatic",
  "mixed",
];

type AdminGiveawayFormProps = {
  giveaway?: CommunityGiveaway;
};

export function AdminGiveawayForm({ giveaway }: AdminGiveawayFormProps) {
  const router = useRouter();
  const [name, setName] = useState(giveaway?.name ?? "");
  const [slug, setSlug] = useState(giveaway?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(giveaway?.short_description ?? "");
  const [description, setDescription] = useState(giveaway?.description ?? "");
  const [prizeDescription, setPrizeDescription] = useState(giveaway?.prize_description ?? "");
  const [entryType, setEntryType] = useState<GiveawayEntryType>(
    giveaway?.entry_type ?? "free",
  );
  const [pointsCost, setPointsCost] = useState(String(giveaway?.points_cost ?? 0));
  const [maxEntries, setMaxEntries] = useState(
    giveaway?.max_entries_per_user?.toString() ?? "",
  );
  const [allowMultiple, setAllowMultiple] = useState(
    giveaway?.allow_multiple_entries ?? false,
  );
  const [winnerCount, setWinnerCount] = useState(String(giveaway?.winner_count ?? 1));
  const [alternateCount, setAlternateCount] = useState(
    String(giveaway?.alternate_count ?? 0),
  );
  const [startsAt, setStartsAt] = useState(
    giveaway?.starts_at?.slice(0, 16) ?? "",
  );
  const [closesAt, setClosesAt] = useState(
    giveaway?.closes_at?.slice(0, 16) ?? "",
  );
  const [drawAt, setDrawAt] = useState(giveaway?.draw_at?.slice(0, 16) ?? "");
  const [claimDeadline, setClaimDeadline] = useState(
    giveaway?.claim_deadline?.slice(0, 16) ?? "",
  );
  const [terms, setTerms] = useState(giveaway?.terms_and_conditions ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveGiveawayAction(
        {
          name,
          slug: slug || slugifyGiveawayName(name),
          short_description: shortDescription,
          description,
          prize_description: prizeDescription,
          entry_type: entryType,
          points_cost: Number(pointsCost),
          max_entries_per_user: maxEntries.trim() ? Number(maxEntries) : null,
          allow_multiple_entries: allowMultiple,
          winner_count: Number(winnerCount),
          alternate_count: Number(alternateCount),
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
          draw_at: drawAt ? new Date(drawAt).toISOString() : null,
          claim_deadline: claimDeadline ? new Date(claimDeadline).toISOString() : null,
          terms_and_conditions: terms,
          status: giveaway?.status ?? "draft",
          is_public: true,
        },
        giveaway?.id,
      );

      setMessage(result.success ? "Guardado." : result.error ?? "Error");
      if (result.success && result.id) {
        router.push(ROUTES.adminComunidadSorteo(result.id));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-800 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          required
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug-url"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={prizeDescription}
          onChange={(e) => setPrizeDescription(e.target.value)}
          placeholder="Premio"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm sm:col-span-2"
          required
        />
        <textarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="Descripción corta"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm sm:col-span-2"
          rows={2}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción completa"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm sm:col-span-2"
          rows={4}
        />
        <select
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as GiveawayEntryType)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={pointsCost}
          onChange={(e) => setPointsCost(e.target.value)}
          placeholder="Costo en puntos"
          type="number"
          min={0}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={maxEntries}
          onChange={(e) => setMaxEntries(e.target.value)}
          placeholder="Máx. por usuario"
          type="number"
          min={1}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
          />
          Permitir múltiples participaciones
        </label>
        <input
          value={winnerCount}
          onChange={(e) => setWinnerCount(e.target.value)}
          placeholder="Ganadores"
          type="number"
          min={1}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={alternateCount}
          onChange={(e) => setAlternateCount(e.target.value)}
          placeholder="Suplentes"
          type="number"
          min={0}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          type="datetime-local"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          type="datetime-local"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={drawAt}
          onChange={(e) => setDrawAt(e.target.value)}
          type="datetime-local"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          value={claimDeadline}
          onChange={(e) => setClaimDeadline(e.target.value)}
          type="datetime-local"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Bases y condiciones"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm sm:col-span-2"
          rows={4}
        />
      </div>
      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
      >
        {pending ? "Guardando…" : giveaway ? "Actualizar" : "Crear sorteo"}
      </button>
    </form>
  );
}
