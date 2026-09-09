type StepItemProps = {
  number: number;
  title: string;
  description: string;
};

export function StepItem({ number, title, description }: StepItemProps) {
  return (
    <div className="relative flex items-start gap-4">
      <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white shadow-sm shadow-accent/30">
        {number}
      </span>
      <div>
        <p className="text-base font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>
    </div>
  );
}
