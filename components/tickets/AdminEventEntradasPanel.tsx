"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TicketTypeForm } from "@/components/tickets/TicketTypeForm";
import { TicketTypesList } from "@/components/tickets/TicketTypesList";
import type { TicketTypeActionResult, TicketTypeFormInput } from "@/lib/tickets/types";
import type { TicketType } from "@/lib/tickets/types";

type AdminEventEntradasPanelProps = {
  ticketTypes: TicketType[];
  createAction: (
    prevState: TicketTypeActionResult,
    formData: FormData,
  ) => Promise<TicketTypeActionResult>;
  createInitialValues: TicketTypeFormInput;
};

export function AdminEventEntradasPanel({
  ticketTypes,
  createAction,
  createInitialValues,
}: AdminEventEntradasPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">
          Tipos de entrada ({ticketTypes.length})
        </h2>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Agregar entrada
        </Button>
      </div>

      <div className="mt-4">
        <TicketTypesList ticketTypes={ticketTypes} />
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Agregar entrada"
      >
        <TicketTypeForm
          title="Agregar entrada"
          action={createAction}
          submitLabel="Guardar"
          initialValues={createInitialValues}
          embedded
          showTitle={false}
          hideSuccessMessage
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </>
  );
}
