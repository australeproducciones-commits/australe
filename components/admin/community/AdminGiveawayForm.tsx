"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AdminGiveawayFormHeader } from "@/components/admin/community/giveaway-form/AdminGiveawayFormHeader";
import {
  AdminGiveawayFormField,
  giveawayInputClass,
  giveawaySelectClass,
  giveawayTextareaClass,
} from "@/components/admin/community/giveaway-form/AdminGiveawayFormField";
import { AdminGiveawayFormSection } from "@/components/admin/community/giveaway-form/AdminGiveawayFormSection";
import { AdminGiveawayFormSummary } from "@/components/admin/community/giveaway-form/AdminGiveawayFormSummary";
import { Button } from "@/components/ui/Button";
import { saveGiveawayAction } from "@/lib/community/giveaways/admin-actions";
import {
  GIVEAWAY_ENTRY_TYPE_OPTIONS,
  getEntryTypeDescription,
  SHORT_DESCRIPTION_MAX,
} from "@/lib/community/giveaways/form-ui";
import {
  hasGiveawayFormErrors,
  validateGiveawayFormFields,
  type GiveawayFormFieldErrors,
} from "@/lib/community/giveaways/form-validation";
import type {
  CommunityGiveaway,
  GiveawayEntryType,
  GiveawayFormInput,
} from "@/lib/community/giveaways/types";
import { slugifyGiveawayName } from "@/lib/community/giveaways/utils";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type CommunityLevelOption = {
  id: string;
  name: string;
};

type AdminGiveawayFormProps = {
  giveaway?: CommunityGiveaway;
  communityLevels?: CommunityLevelOption[];
};

function toDateTimeLocal(value: string | null | undefined): string {
  return value?.slice(0, 16) ?? "";
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AdminGiveawayForm({
  giveaway,
  communityLevels = [],
}: AdminGiveawayFormProps) {
  const router = useRouter();
  const isEdit = Boolean(giveaway);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(giveaway?.name ?? "");
  const [slug, setSlug] = useState(giveaway?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(giveaway?.slug));
  const [shortDescription, setShortDescription] = useState(
    giveaway?.short_description ?? "",
  );
  const [description, setDescription] = useState(giveaway?.description ?? "");
  const [prizeDescription, setPrizeDescription] = useState(
    giveaway?.prize_description ?? "",
  );
  const [imageUrl, setImageUrl] = useState(giveaway?.image_url ?? "");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [entryType, setEntryType] = useState<GiveawayEntryType>(
    giveaway?.entry_type ?? "free",
  );
  const [pointsCost, setPointsCost] = useState(
    String(giveaway?.points_cost ?? 0),
  );
  const [maxEntries, setMaxEntries] = useState(
    giveaway?.max_entries_per_user?.toString() ??
      (giveaway?.allow_multiple_entries ? "" : "1"),
  );
  const [allowMultiple, setAllowMultiple] = useState(
    giveaway?.allow_multiple_entries ?? false,
  );
  const [winnerCount, setWinnerCount] = useState(
    String(giveaway?.winner_count ?? 1),
  );
  const [alternateCount, setAlternateCount] = useState(
    String(giveaway?.alternate_count ?? 0),
  );
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(giveaway?.starts_at));
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(giveaway?.closes_at));
  const [drawAt, setDrawAt] = useState(toDateTimeLocal(giveaway?.draw_at));
  const [claimDeadline, setClaimDeadline] = useState(
    toDateTimeLocal(giveaway?.claim_deadline),
  );
  const [terms, setTerms] = useState(giveaway?.terms_and_conditions ?? "");
  const [requiresValidTicket, setRequiresValidTicket] = useState(
    giveaway?.requires_valid_ticket ?? false,
  );
  const [requiresUsedTicket, setRequiresUsedTicket] = useState(
    giveaway?.requires_used_ticket ?? false,
  );
  const [minimumPurchaseAmount, setMinimumPurchaseAmount] = useState(
    giveaway?.minimum_purchase_amount != null
      ? String(giveaway.minimum_purchase_amount)
      : "",
  );
  const [limitByLevel, setLimitByLevel] = useState(
    Boolean(giveaway?.minimum_community_level),
  );
  const [minimumCommunityLevel, setMinimumCommunityLevel] = useState(
    giveaway?.minimum_community_level ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<GiveawayFormFieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyGiveawayName(value));
    }
  }

  function handleAllowMultipleChange(checked: boolean) {
    setAllowMultiple(checked);
    if (!checked) {
      setMaxEntries("1");
    }
  }

  function handleEntryTypeChange(value: GiveawayEntryType) {
    setEntryType(value);
    if (value === "free") {
      setPointsCost("0");
    }
  }

  function handleImageUrlChange(value: string) {
    setImageUrl(value);
    setImagePreviewError(false);
  }

  const effectiveSlug = slug.trim() || slugifyGiveawayName(name);
  const showPointsCost = entryType === "points" || entryType === "mixed";
  const showStorePurchase = entryType === "store_purchase";
  const showTicketFields = entryType === "ticket";

  const formInput = useMemo((): GiveawayFormInput => {
    const parsedPoints =
      entryType === "free" ? 0 : parsePositiveInt(pointsCost, 0);

    return {
      name: name.trim(),
      slug: effectiveSlug,
      short_description: shortDescription.trim(),
      description: description.trim(),
      prize_description: prizeDescription.trim(),
      image_url: imageUrl.trim() || null,
      entry_type: entryType,
      points_cost: parsedPoints,
      max_entries_per_user: allowMultiple
        ? maxEntries.trim()
          ? parsePositiveInt(maxEntries, 1)
          : null
        : 1,
      allow_multiple_entries: allowMultiple,
      winner_count: parsePositiveInt(winnerCount, 1),
      alternate_count: parsePositiveInt(alternateCount, 0),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      draw_at: drawAt ? new Date(drawAt).toISOString() : null,
      claim_deadline: claimDeadline
        ? new Date(claimDeadline).toISOString()
        : null,
      terms_and_conditions: terms.trim(),
      requires_valid_ticket: requiresValidTicket,
      requires_used_ticket: requiresUsedTicket,
      minimum_purchase_amount: showStorePurchase
        ? minimumPurchaseAmount.trim()
          ? parsePositiveInt(minimumPurchaseAmount, 0)
          : null
        : null,
      minimum_community_level:
        limitByLevel && minimumCommunityLevel ? minimumCommunityLevel : null,
      status: giveaway?.status ?? "draft",
      is_public: true,
    };
  }, [
    name,
    effectiveSlug,
    shortDescription,
    description,
    prizeDescription,
    imageUrl,
    entryType,
    pointsCost,
    allowMultiple,
    maxEntries,
    winnerCount,
    alternateCount,
    startsAt,
    closesAt,
    drawAt,
    claimDeadline,
    terms,
    requiresValidTicket,
    requiresUsedTicket,
    minimumPurchaseAmount,
    limitByLevel,
    minimumCommunityLevel,
    showStorePurchase,
    giveaway?.status,
  ]);

  const validationErrors = useMemo(
    () => validateGiveawayFormFields(formInput),
    [formInput],
  );

  const summaryState = useMemo(() => {
    const dateErrors =
      Boolean(validationErrors.starts_at) ||
      Boolean(validationErrors.closes_at) ||
      Boolean(validationErrors.draw_at) ||
      Boolean(validationErrors.claim_deadline);

    const hasValidDates =
      Boolean(startsAt && closesAt && drawAt && claimDeadline) && !dateErrors;

    const hasEntryTypeConfigured =
      entryType === "free" ||
      (showPointsCost && parsePositiveInt(pointsCost, 0) > 0) ||
      (showStorePurchase && parsePositiveInt(minimumPurchaseAmount, 0) > 0) ||
      ["ticket", "attendance", "automatic", "mixed"].includes(entryType);

    return {
      name,
      prizeDescription,
      entryType,
      pointsCost: parsePositiveInt(pointsCost, 0),
      allowMultiple,
      maxEntries: allowMultiple
        ? maxEntries.trim()
          ? parsePositiveInt(maxEntries, 1)
          : null
        : 1,
      winnerCount: parsePositiveInt(winnerCount, 1),
      alternateCount: parsePositiveInt(alternateCount, 0),
      startsAt,
      closesAt,
      drawAt,
      claimDeadline,
      hasMainInfo: Boolean(name.trim() && effectiveSlug.trim()),
      hasPrize: Boolean(prizeDescription.trim()),
      hasEntryType: hasEntryTypeConfigured,
      hasValidDates,
      hasTerms: Boolean(terms.trim()),
    };
  }, [
    name,
    prizeDescription,
    entryType,
    pointsCost,
    allowMultiple,
    maxEntries,
    winnerCount,
    alternateCount,
    startsAt,
    closesAt,
    drawAt,
    claimDeadline,
    terms,
    effectiveSlug,
    showPointsCost,
    showStorePurchase,
    minimumPurchaseAmount,
    validationErrors,
  ]);

  const canSubmit =
    !pending &&
    !hasGiveawayFormErrors(validationErrors) &&
    Boolean(name.trim()) &&
    Boolean(prizeDescription.trim()) &&
    Boolean(effectiveSlug.trim());

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormMessage(null);

    const errors = validateGiveawayFormFields(formInput);
    setFieldErrors(errors);

    if (hasGiveawayFormErrors(errors)) {
      setFormMessage("Revisá los campos marcados antes de guardar.");
      return;
    }

    startTransition(async () => {
      const result = await saveGiveawayAction(formInput, giveaway?.id);
      if (!result.success) {
        setFormMessage(result.error ?? "No se pudo guardar el sorteo.");
        return;
      }

      if (result.id) {
        router.push(ROUTES.adminComunidadSorteo(result.id));
      }
    });
  }

  const winnersSummary = `${parsePositiveInt(winnerCount, 1)} ganador${
    parsePositiveInt(winnerCount, 1) === 1 ? "" : "es"
  } · ${parsePositiveInt(alternateCount, 0)} suplente${
    parsePositiveInt(alternateCount, 0) === 1 ? "" : "s"
  }`;

  const hasExtraRequirements =
    requiresValidTicket || requiresUsedTicket || limitByLevel;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminGiveawayFormHeader
        mode={isEdit ? "edit" : "create"}
        status={giveaway?.status ?? "draft"}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <AdminGiveawayFormSection
              title="Información del sorteo"
              description="Estos datos serán visibles para los miembros de Comunidad."
            >
              <AdminGiveawayFormField
                id="giveaway-name"
                label="Nombre del sorteo"
                required
                help="Usá un nombre corto, claro y fácil de reconocer."
                error={fieldErrors.name}
              >
                <input
                  id="giveaway-name"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ej.: Sorteo entradas VIP — Fiesta Australe"
                  className={giveawayInputClass}
                  disabled={pending}
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                />
              </AdminGiveawayFormField>

              <AdminGiveawayFormField
                id="giveaway-slug"
                label="Slug"
                required
                help="Se utiliza en la dirección pública del sorteo."
                error={fieldErrors.slug}
              >
                <input
                  id="giveaway-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  placeholder="sorteo-entradas-vip"
                  className={giveawayInputClass}
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.slug)}
                />
                <p className="mt-2 text-xs text-purple-300/90">
                  Vista previa: {ROUTES.comunidadSorteo(effectiveSlug || "slug")}
                </p>
              </AdminGiveawayFormField>

              <AdminGiveawayFormField
                id="giveaway-prize"
                label="Premio"
                required
                help="Indicá exactamente qué recibirá el ganador."
                error={fieldErrors.prize_description}
              >
                <input
                  id="giveaway-prize"
                  value={prizeDescription}
                  onChange={(event) => setPrizeDescription(event.target.value)}
                  placeholder="Ej.: 2 entradas VIP + acceso backstage"
                  className={giveawayInputClass}
                  disabled={pending}
                  required
                  aria-invalid={Boolean(fieldErrors.prize_description)}
                />
              </AdminGiveawayFormField>

              <AdminGiveawayFormField
                id="giveaway-short-description"
                label="Descripción corta"
                optional
                help={`Se mostrará en las tarjetas y listados. Máximo sugerido: ${SHORT_DESCRIPTION_MAX} caracteres.`}
                error={fieldErrors.short_description}
              >
                <textarea
                  id="giveaway-short-description"
                  value={shortDescription}
                  onChange={(event) => setShortDescription(event.target.value)}
                  placeholder="Ej.: Participá con tus puntos y ganá una experiencia exclusiva."
                  className={giveawayTextareaClass}
                  rows={2}
                  maxLength={SHORT_DESCRIPTION_MAX + 40}
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.short_description)}
                />
                <p className="mt-1 text-right text-xs text-zinc-600">
                  {shortDescription.length}/{SHORT_DESCRIPTION_MAX}
                </p>
              </AdminGiveawayFormField>

              <AdminGiveawayFormField
                id="giveaway-description"
                label="Descripción completa"
                optional
                help="Explicá el premio, cómo participar y cualquier información importante."
                error={fieldErrors.description}
              >
                <textarea
                  id="giveaway-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Explicá el premio, cómo participar y cualquier información importante."
                  className={giveawayTextareaClass}
                  rows={4}
                  disabled={pending}
                />
              </AdminGiveawayFormField>
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection
              title="Imagen del sorteo"
              description="Podés usar una imagen horizontal del premio o del evento."
            >
              <AdminGiveawayFormField
                id="giveaway-image"
                label="URL de imagen"
                optional
                help="Podés usar una imagen horizontal del premio o del evento."
                error={fieldErrors.image_url}
              >
                <input
                  id="giveaway-image"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => handleImageUrlChange(event.target.value)}
                  placeholder="https://..."
                  className={giveawayInputClass}
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.image_url)}
                />
              </AdminGiveawayFormField>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-950/40 via-zinc-950 to-zinc-900">
                {imageUrl.trim() && !imagePreviewError && !fieldErrors.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl.trim()}
                    alt="Vista previa del sorteo"
                    className="aspect-[21/9] w-full object-cover"
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <div className="flex aspect-[21/9] items-center justify-center px-6 text-center text-sm text-zinc-500">
                    {imagePreviewError || fieldErrors.image_url
                      ? "No se pudo cargar la imagen. Revisá la URL."
                      : "Vista previa de la imagen"}
                  </div>
                )}
              </div>
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection title="Forma de participación">
              <AdminGiveawayFormField
                id="giveaway-entry-type"
                label="Modalidad"
                required
                error={fieldErrors.entry_type}
              >
                <select
                  id="giveaway-entry-type"
                  value={entryType}
                  onChange={(event) =>
                    handleEntryTypeChange(event.target.value as GiveawayEntryType)
                  }
                  className={giveawaySelectClass}
                  disabled={pending}
                >
                  {GIVEAWAY_ENTRY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-zinc-400">
                  {getEntryTypeDescription(entryType)}
                </p>
              </AdminGiveawayFormField>

              {entryType === "free" ? (
                <p className="rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400">
                  Participación sin costo en puntos. El sistema registrará el costo
                  como 0 automáticamente.
                </p>
              ) : null}

              {showPointsCost ? (
                <AdminGiveawayFormField
                  id="giveaway-points-cost"
                  label="Costo por participación"
                  required
                  help="Cantidad de puntos que se descontará por cada participación."
                  error={fieldErrors.points_cost}
                >
                  <div className="relative max-w-xs">
                    <input
                      id="giveaway-points-cost"
                      type="number"
                      min={1}
                      value={pointsCost}
                      onChange={(event) => setPointsCost(event.target.value)}
                      placeholder="100"
                      className={cn(giveawayInputClass, "pr-16")}
                      disabled={pending}
                      aria-invalid={Boolean(fieldErrors.points_cost)}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                      puntos
                    </span>
                  </div>
                </AdminGiveawayFormField>
              ) : null}

              {showTicketFields ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <RequirementSwitch
                    id="ticket-requires-valid"
                    label="Requiere entrada válida"
                    description="Solo participan usuarios con una entrada asociada al evento."
                    checked={requiresValidTicket}
                    onChange={setRequiresValidTicket}
                    disabled={pending}
                  />
                  <RequirementSwitch
                    id="ticket-requires-used"
                    label="Requiere entrada utilizada o asistencia"
                    description="La entrada debe estar utilizada o con asistencia confirmada."
                    checked={requiresUsedTicket}
                    onChange={setRequiresUsedTicket}
                    disabled={pending}
                  />
                </div>
              ) : null}

              {showStorePurchase ? (
                <AdminGiveawayFormField
                  id="giveaway-minimum-purchase"
                  label="Compra mínima requerida"
                  required
                  help="Solo se generarán chances para pedidos iguales o superiores a este importe."
                  error={fieldErrors.minimum_purchase_amount}
                >
                  <div className="relative max-w-xs">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
                      $
                    </span>
                    <input
                      id="giveaway-minimum-purchase"
                      type="number"
                      min={1}
                      value={minimumPurchaseAmount}
                      onChange={(event) =>
                        setMinimumPurchaseAmount(event.target.value)
                      }
                      placeholder="15000"
                      className={cn(giveawayInputClass, "pl-7")}
                      disabled={pending}
                      aria-invalid={Boolean(fieldErrors.minimum_purchase_amount)}
                    />
                  </div>
                </AdminGiveawayFormField>
              ) : null}
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection title="Límites de participación">
              <RequirementSwitch
                id="giveaway-allow-multiple"
                label="Permitir múltiples participaciones"
                description="El usuario podrá obtener más de una chance hasta alcanzar el máximo configurado."
                checked={allowMultiple}
                onChange={handleAllowMultipleChange}
                disabled={pending}
              />

              <AdminGiveawayFormField
                id="giveaway-max-entries"
                label="Máximo de participaciones por usuario"
                required={allowMultiple}
                help="Cantidad máxima de chances que puede obtener cada miembro."
                error={fieldErrors.max_entries_per_user}
              >
                <input
                  id="giveaway-max-entries"
                  type="number"
                  min={1}
                  value={maxEntries}
                  onChange={(event) => setMaxEntries(event.target.value)}
                  placeholder="1"
                  className={cn(giveawayInputClass, "max-w-xs")}
                  disabled={pending || !allowMultiple}
                  aria-invalid={Boolean(fieldErrors.max_entries_per_user)}
                />
              </AdminGiveawayFormField>
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection title="Ganadores y suplentes">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminGiveawayFormField
                  id="giveaway-winner-count"
                  label="Cantidad de ganadores"
                  required
                  help="Personas que recibirán el premio."
                  error={fieldErrors.winner_count}
                >
                  <input
                    id="giveaway-winner-count"
                    type="number"
                    min={1}
                    value={winnerCount}
                    onChange={(event) => setWinnerCount(event.target.value)}
                    placeholder="1"
                    className={cn(giveawayInputClass, "max-w-xs")}
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.winner_count)}
                  />
                </AdminGiveawayFormField>

                <AdminGiveawayFormField
                  id="giveaway-alternate-count"
                  label="Cantidad de suplentes"
                  help="Se utilizarán si un ganador no reclama el premio."
                  error={fieldErrors.alternate_count}
                >
                  <input
                    id="giveaway-alternate-count"
                    type="number"
                    min={0}
                    value={alternateCount}
                    onChange={(event) => setAlternateCount(event.target.value)}
                    placeholder="2"
                    className={cn(giveawayInputClass, "max-w-xs")}
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.alternate_count)}
                  />
                </AdminGiveawayFormField>
              </div>
              <p className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-2 text-sm text-zinc-300">
                {winnersSummary}
              </p>
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection title="Fechas importantes">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminGiveawayFormField
                  id="giveaway-starts-at"
                  label="Inicio de participación"
                  optional
                  help="Desde este momento los usuarios podrán participar."
                  error={fieldErrors.starts_at}
                >
                  <input
                    id="giveaway-starts-at"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className={giveawayInputClass}
                    disabled={pending}
                  />
                </AdminGiveawayFormField>

                <AdminGiveawayFormField
                  id="giveaway-closes-at"
                  label="Cierre de participación"
                  optional
                  help="Después de esta fecha no se aceptarán nuevas chances."
                  error={fieldErrors.closes_at}
                >
                  <input
                    id="giveaway-closes-at"
                    type="datetime-local"
                    value={closesAt}
                    onChange={(event) => setClosesAt(event.target.value)}
                    className={giveawayInputClass}
                    disabled={pending}
                  />
                </AdminGiveawayFormField>

                <AdminGiveawayFormField
                  id="giveaway-draw-at"
                  label="Fecha prevista del sorteo"
                  optional
                  help="Momento estimado en que se seleccionarán los ganadores."
                  error={fieldErrors.draw_at}
                >
                  <input
                    id="giveaway-draw-at"
                    type="datetime-local"
                    value={drawAt}
                    onChange={(event) => setDrawAt(event.target.value)}
                    className={giveawayInputClass}
                    disabled={pending}
                  />
                </AdminGiveawayFormField>

                <AdminGiveawayFormField
                  id="giveaway-claim-deadline"
                  label="Fecha límite para reclamar"
                  optional
                  help="Después de esta fecha podrá activarse un suplente."
                  error={fieldErrors.claim_deadline}
                >
                  <input
                    id="giveaway-claim-deadline"
                    type="datetime-local"
                    value={claimDeadline}
                    onChange={(event) => setClaimDeadline(event.target.value)}
                    className={giveawayInputClass}
                    disabled={pending}
                  />
                </AdminGiveawayFormField>
              </div>

              <p className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400">
                Inicio → Cierre → Sorteo → Límite de reclamo
              </p>
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection
              title="Requisitos de participación"
              description="Los requisitos se validan automáticamente al momento de participar."
            >
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-300">
                Solo miembros activos de Comunidad pueden participar.
              </div>

              {!hasExtraRequirements ? (
                <p className="text-sm text-zinc-400">
                  Cualquier miembro activo de Comunidad puede participar.
                </p>
              ) : null}

              <div className="space-y-3">
                <RequirementSwitch
                  id="giveaway-requires-valid-ticket"
                  label="Requiere entrada válida"
                  description="El usuario debe contar con una entrada válida asociada."
                  checked={requiresValidTicket}
                  onChange={setRequiresValidTicket}
                  disabled={pending}
                />
                <RequirementSwitch
                  id="giveaway-requires-used-ticket"
                  label="Requiere entrada utilizada o asistencia confirmada"
                  description="La entrada debe estar utilizada o con asistencia confirmada."
                  checked={requiresUsedTicket}
                  onChange={setRequiresUsedTicket}
                  disabled={pending}
                />
                <RequirementSwitch
                  id="giveaway-limit-level"
                  label="Limitar por nivel de Comunidad"
                  description="Solo podrán participar miembros con el nivel mínimo seleccionado."
                  checked={limitByLevel}
                  onChange={(checked) => {
                    setLimitByLevel(checked);
                    if (!checked) {
                      setMinimumCommunityLevel("");
                    }
                  }}
                  disabled={pending}
                />
              </div>

              {limitByLevel ? (
                <AdminGiveawayFormField
                  id="giveaway-minimum-level"
                  label="Nivel mínimo requerido"
                  required
                >
                  <select
                    id="giveaway-minimum-level"
                    value={minimumCommunityLevel}
                    onChange={(event) =>
                      setMinimumCommunityLevel(event.target.value)
                    }
                    className={giveawaySelectClass}
                    disabled={pending || communityLevels.length === 0}
                  >
                    <option value="">Seleccioná un nivel</option>
                    {communityLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                  {communityLevels.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-300">
                      No hay niveles configurados en Comunidad.
                    </p>
                  ) : null}
                </AdminGiveawayFormField>
              ) : null}
            </AdminGiveawayFormSection>

            <AdminGiveawayFormSection title="Bases y condiciones">
              <AdminGiveawayFormField
                id="giveaway-terms"
                label="Bases y condiciones"
                optional
                help="Este contenido será visible en el detalle público del sorteo."
                error={fieldErrors.terms_and_conditions}
              >
                <textarea
                  id="giveaway-terms"
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  placeholder="Detallá las condiciones de participación, forma de entrega del premio, plazo de reclamo y cualquier restricción aplicable."
                  className={giveawayTextareaClass}
                  rows={6}
                  disabled={pending}
                />
                <p className="mt-1 text-right text-xs text-zinc-600">
                  {terms.length} caracteres
                </p>
              </AdminGiveawayFormField>
            </AdminGiveawayFormSection>

            <div className="xl:hidden">
              <AdminGiveawayFormSummary state={summaryState} />
            </div>
          </div>

          <div className="hidden xl:block">
            <AdminGiveawayFormSummary state={summaryState} />
          </div>
        </div>

        {formMessage || fieldErrors.form ? (
          <p
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {formMessage ?? fieldErrors.form}
          </p>
        ) : null}

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/10 bg-zinc-950/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              {isEdit
                ? "Los cambios se guardan en el sorteo actual."
                : "El sorteo se creará en estado borrador."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                href={ROUTES.adminComunidadSorteos}
                variant="outline"
                size="md"
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:bg-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              >
                {pending
                  ? isEdit
                    ? "Guardando cambios…"
                    : "Creando sorteo…"
                  : isEdit
                    ? "Guardar cambios"
                    : "Crear sorteo"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function RequirementSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-zinc-200">
          {label}
        </label>
        <p id={`${id}-help`} className="mt-1 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-help`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50",
          checked ? "bg-purple-500" : "bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
