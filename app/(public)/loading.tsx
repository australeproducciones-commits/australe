export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6">
      <div className="h-8 w-48 rounded-lg bg-[var(--public-border)]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 rounded-2xl bg-[var(--public-border)]" />
        <div className="h-40 rounded-2xl bg-[var(--public-border)]" />
        <div className="h-40 rounded-2xl bg-[var(--public-border)]" />
      </div>
    </div>
  );
}
