type CheckCardProps = {
  title: string;
  description: string;
};

export function CheckCard({ title, description }: CheckCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-6">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
    </div>
  );
}
