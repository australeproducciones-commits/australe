type AdminHeaderProps = {
  title: string;
  description?: string;
};

export function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <div className="border-b border-white/10 bg-black/20 px-4 py-6 sm:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-purple-300">
        Administración
      </p>
      <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
