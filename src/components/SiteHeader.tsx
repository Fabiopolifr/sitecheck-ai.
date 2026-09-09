import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-900"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white"
            aria-hidden
          >
            S
          </span>
          SiteCheck AI
        </Link>
        <p className="hidden text-sm text-zinc-500 sm:block">
          Analisi tecnica per agenzie immobiliari
        </p>
      </div>
    </header>
  );
}
