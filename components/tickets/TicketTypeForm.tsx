"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TicketTypeActionResult, TicketTypeFormInput } from "@/lib/tickets/types";
import { SUGGESTED_TICKET_TYPE_NAMES } from "@/lib/tickets/types";
import {
  adminFormClassName,
  adminInputClassName,
} from "@/lib/utils/adminFormStyles";
import { cn } from "@/lib/utils/cn";

const defaultValues: TicketTypeFormInput = {
  name: "",
  description: "",
  public_price: "0",
  community_price: "",
  stock_total: "",
  max_per_order: "10",
  sale_start_at: "",
  sale_end_at: "",
  is_active: true,
  sort_order: "0",
};

type TicketTypeFormProps = {
  title: string;
  initialValues?: TicketTypeFormInput;
  action: (
    prevState: TicketTypeActionResult,
    formData: FormData,
  ) => Promise<TicketTypeActionResult>;
  submitLabel: string;
  onCancel?: () => void;
  embedded?: boolean;
  showTitle?: boolean;
  hideSuccessMessage?: boolean;
};

export function TicketTypeForm({
  title,
  initialValues,
  action,
  submitLabel,
  onCancel,
  embedded = false,
  showTitle = true,
  hideSuccessMessage = false,
}: TicketTypeFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      if (onCancel) {
        onCancel();
      }
    }
  }, [state.success, router, onCancel]);

  function updateField<K extends keyof TicketTypeFormInput>(
    key: K,
    value: TicketTypeFormInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const formContent = (
    <form action={formAction} className={cn(adminFormClassName, "space-y-4")}>
      {showTitle && !embedded ? (
        <h3 className="text-lg font-bold text-white">{title}</h3>
      ) : null}

      <Field label="Nombre *">
        <input
          name="name"
          value={values.name}
          onChange={(e) => updateField("name", e.target.value)}
          className={adminInputClassName}
          required
          disabled={pending}
          list="ticket-type-suggestions"
        />
        <datalist id="ticket-type-suggestions">
          {SUGGESTED_TICKET_TYPE_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-zinc-500">
          {SUGGESTED_TICKET_TYPE_NAMES.join(" · ")}
        </p>
      </Field>

      <Field label="Descripción">
        <textarea
          name="description"
          value={values.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={2}
          className={cn(adminInputClassName, "resize-y")}
          disabled={pending}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Precio público *">
          <input
            name="public_price"
            type="number"
            min={0}
            step="0.01"
            value={values.public_price}
            onChange={(e) => updateField("public_price", e.target.value)}
            className={adminInputClassName}
            required
            disabled={pending}
          />
        </Field>

        <Field label="Precio comunidad">
          <input
            name="community_price"
            type="number"
            min={0}
            step="0.01"
            value={values.community_price}
            onChange={(e) => updateField("community_price", e.target.value)}
            className={adminInputClassName}
            placeholder="Opcional"
            disabled={pending}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Stock total">
          <input
            name="stock_total"
            type="number"
            min={0}
            value={values.stock_total}
            onChange={(e) => updateField("stock_total", e.target.value)}
            className={adminInputClassName}
            placeholder="Ilimitado"
            disabled={pending}
          />
        </Field>

        <Field label="Máx. por compra *">
          <input
            name="max_per_order"
            type="number"
            min={1}
            value={values.max_per_order}
            onChange={(e) => updateField("max_per_order", e.target.value)}
            className={adminInputClassName}
            required
            disabled={pending}
          />
        </Field>

        <Field label="Orden">
          <input
            name="sort_order"
            type="number"
            min={0}
            value={values.sort_order}
            onChange={(e) => updateField("sort_order", e.target.value)}
            className={adminInputClassName}
            disabled={pending}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inicio de venta">
          <input
            name="sale_start_at"
            type="datetime-local"
            value={values.sale_start_at}
            onChange={(e) => updateField("sale_start_at", e.target.value)}
            className={adminInputClassName}
            disabled={pending}
          />
        </Field>

        <Field label="Fin de venta">
          <input
            name="sale_end_at"
            type="datetime-local"
            value={values.sale_end_at}
            onChange={(e) => updateField("sale_end_at", e.target.value)}
            className={adminInputClassName}
            disabled={pending}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-zinc-900/60 px-4 py-3">
        <input
          name="is_active"
          type="checkbox"
          checked={values.is_active}
          onChange={(e) => updateField("is_active", e.target.checked)}
          disabled={pending}
          className="h-4 w-4 rounded border-white/20 bg-zinc-900"
        />
        <span className="text-sm text-zinc-200">Activo para venta</span>
      </label>

      {state.error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      {!hideSuccessMessage && state.success ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Guardado correctamente.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Card padding="lg" className={adminFormClassName}>
      {formContent}
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}
