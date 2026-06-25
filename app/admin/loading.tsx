export default function AdminLoading() {
  return (
    <div className="animate-pulse px-4 py-8 sm:px-8">
      <div className="h-8 w-56 rounded bg-zinc-800" />
      <div className="mt-3 h-4 w-80 rounded bg-zinc-900" />
      <div className="mt-8 space-y-4">
        <div className="h-28 rounded-xl bg-zinc-900" />
        <div className="h-28 rounded-xl bg-zinc-900" />
      </div>
    </div>
  );
}
