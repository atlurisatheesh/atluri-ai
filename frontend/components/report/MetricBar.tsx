type MetricBarProps = {
  label: string;
  value: number;
  max?: number;
};

export default function MetricBar({ label, value, max = 5 }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const pct = Math.round((clamped / max) * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm text-zinc-300">
        <span>{label}</span>
        <span>{clamped.toFixed(1)}/{max}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
