import { cn } from "@/lib/utils/cn";

type AdminGiveawayFormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminGiveawayFormField({
  id,
  label,
  required,
  optional,
  help,
  error,
  children,
  className,
}: AdminGiveawayFormFieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-200">
        {label}
        {required ? (
          <span className="ml-1 text-purple-300" aria-hidden="true">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="ml-2 text-xs font-normal text-zinc-500">(opcional)</span>
        ) : null}
      </label>
      <div aria-describedby={describedBy}>{children}</div>
      {help ? (
        <p id={helpId} className="text-xs leading-5 text-zinc-500">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const giveawayInputClass =
  "w-full max-w-xl rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:opacity-60";

export const giveawaySelectClass = giveawayInputClass;

export const giveawayTextareaClass =
  "w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:opacity-60";
