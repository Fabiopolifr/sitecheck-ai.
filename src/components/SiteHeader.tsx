import Link from "next/link";
import { LogomarkIcon } from "@/components/icons";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-brand-navy"
        >
          <LogomarkIcon className="h-8 w-8" />
          Free<span className="text-accent">Cookie</span>be
        </Link>
        <p className="hidden text-sm text-zinc-500 sm:block">
          Privacy semplice. Websites più sicuri.
        </p>
      </div>
    </header>
  );
}
