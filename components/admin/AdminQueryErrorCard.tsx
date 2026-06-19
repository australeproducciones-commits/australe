import { Card } from "@/components/ui/Card";

type AdminQueryErrorCardProps = {
  title?: string;
  message: string;
};

export function AdminQueryErrorCard({
  title = "No se pudieron cargar los datos",
  message,
}: AdminQueryErrorCardProps) {
  return (
    <Card
      padding="lg"
      className="border border-red-500/30 bg-red-500/5 text-center"
    >
      <h2 className="text-xl font-bold text-red-200">{title}</h2>
      <p className="mt-2 text-zinc-400">{message}</p>
    </Card>
  );
}
