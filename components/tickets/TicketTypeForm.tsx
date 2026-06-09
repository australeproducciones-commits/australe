"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TicketTypeActionResult, TicketTypeFormInput } from "@/lib/tickets/types";
import { SUGGESTED_TICKET_TYPE_NAMES } from "@/lib/tickets/types";
import { cn } from "@/lib/utils/cn";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30";

const defaultValues: TicketTypeFormInput = {
  name: "",
  description: "",
  public_price: "0",
  community_price: "0",
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
};

export function TicketTypeForm({
  title,
  initialValues,
  action,
  submitLabel,
  onCancel,
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

  return (
    <Card padding="lg">
      <h3 className="text-lg font-bold text-white">{title}</h3>

      <form action={formAction} className="mt-5 space-y-4">
        <Field label="Nombre *">
          <input
            name="name"
            value={values.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={inputClassName}
            required
            disabled={pending}
            list="ticket-type-suggestions"
          />
          <datalist id="ticket-type-suggestions">
            {SUGGESTED_TICKET_TYPE_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p className="mt-2 text-xs text-zinc-500">
            Sugerencias: {SUGGESTED_TICKET_TYPE_NAMES.join(", ")}
          </p>
        </Field>

        <Field label="Descripción">
          <textarea
            name="description"
            value={values.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={3}
            className={cn(inputClassName, "resize-y")}
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
              className={inputClassName}
              required
              disabled={pending}
            />
          </Field>

          <Field label="Precio comunidad *">
            <input
              name="community_price"
              type="number"
              min={0}
              step="0.01"
              value={values.community_price}
              onChange={(e) => updateField("community_price", e.target.value)}
              className={inputClassName}
              required
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
              className={inputClassName}
              placeholder="Vacío = ilimitado"
              disabled={pending}
            />
          </Field>

          <Field label="Máximo por compra *">
            <input
              name="max_per_order"
              type="number"
              min={1}
              value={values.max_per_order}
              onChange={(e) => updateField("max_per_order", e.target.value)}
              className={inputClassName}
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
              className={inputClassName}
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
              className={inputClassName}
              disabled={pending}
            />
          </Field>

          <Field label="Fin de venta">
            <input
              name="sale_end_at"
              type="datetime-local"
              value={values.sale_end_at}
              onChange={(e) => updateField("sale_end_at", e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <input
            name="is_active"
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => updateField("is_active", e.target.checked)}
            disabled={pending}
            className="h-5 w-5 rounded border-white/20 bg-zinc-900"
          />
          <span className="text-sm text-zinc-300">Activo para venta</span>
        </label>

        {state.error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Guardado correctamente.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? "Guardando..." : submitLabel}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onCancel}
              disabled={pending}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
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
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
