import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
