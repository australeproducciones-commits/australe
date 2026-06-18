export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Hace un momento";
  }
  if (minutes < 60) {
    return `Hace ${minutes} minuto${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} hora${hours === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days === 1 ? "" : "s"}`;
}
