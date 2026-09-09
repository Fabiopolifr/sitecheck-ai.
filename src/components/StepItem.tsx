type StepItemProps = {
  number: number;
  title: string;
};

export function StepItem({ number, title }: StepItemProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
        {number}
      </span>
      <span className="text-base text-zinc-800">{title}</span>
    </div>
  );
}
