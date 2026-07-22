export function buildWhatsappUrl(raw: string, message?: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const base = `https://wa.me/${digits}`;
  const trimmedMessage = message?.trim();
  if (trimmedMessage) {
    return `${base}?text=${encodeURIComponent(trimmedMessage)}`;
  }
  return base;
}

/** Mensaje precargado para la CTA de partners en el footer público. */
export const FOOTER_PARTNERSHIP_WHATSAPP_MESSAGE =
  "Hola, vi la sección “Empresas que nos acompañan” en la página de Australe Producciones. Me gustaría conocer las opciones para formar parte y acompañarlos en sus próximos eventos.";
