import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

type AdminGiveawayFormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminGiveawayFormSection({
  title,
  description,
  children,
  className,
}: AdminGiveawayFormSectionProps) {
  return (
    <Card padding="md" className={cn("space-y-5", className)}>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}
