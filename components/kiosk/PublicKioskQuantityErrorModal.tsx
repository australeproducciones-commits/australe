"use client";

import { Modal } from "@/components/ui/Modal";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PUBLIC_KIOSK_QUANTITY_NOT_ALLOWED } from "@/lib/kiosk/utils";

type PublicKioskQuantityErrorModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PublicKioskQuantityErrorModal({
  open,
  onClose,
}: PublicKioskQuantityErrorModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Cantidad no permitida">
      <p className="text-sm text-zinc-300">{PUBLIC_KIOSK_QUANTITY_NOT_ALLOWED}</p>
      <div className="mt-6">
        <PublicButton type="button" onClick={onClose}>
          Entendido
        </PublicButton>
      </div>
    </Modal>
  );
}
