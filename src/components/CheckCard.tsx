import type { ComponentType } from "react";

type CheckCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

export function CheckCard({ icon: Icon, title, description }: CheckCardProps) {
  return (
    <div className="group rounded-2xl border border-zinc-200 p-6 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
    </div>
  );
}
