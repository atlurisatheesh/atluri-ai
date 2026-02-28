type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "positive" | "warning" | "danger";
};

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "border-zinc-700 bg-zinc-900 text-zinc-100",
  positive: "border-emerald-700 bg-emerald-950/40 text-emerald-100",
  warning: "border-amber-700 bg-amber-950/30 text-amber-100",
  danger: "border-rose-700 bg-rose-950/30 text-rose-100",
};

export default function KpiCard({
  title,
  value,
  subtitle,
  tone = "default",
}: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {subtitle ? <div className="mt-1 text-xs opacity-80">{subtitle}</div> : null}
    </div>
  );
}
