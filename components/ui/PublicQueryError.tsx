type PublicQueryErrorProps = {
  title?: string;
  message: string;
};

export function PublicQueryError({
  title = "No pudimos cargar los eventos",
  message,
}: PublicQueryErrorProps) {
  return (
    <div className="public-card rounded-3xl border border-red-500/20 bg-red-500/5 p-10 text-center">
      <h2 className="public-heading text-xl font-bold text-red-200">{title}</h2>
      <p className="mt-2 text-sm public-text-soft">{message}</p>
    </div>
  );
}
