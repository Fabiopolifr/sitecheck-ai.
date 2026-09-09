import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-100 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-sm text-zinc-500 sm:flex-row sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} Freesbe S.r.l. — SiteCheck AI
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-zinc-900">
            Home
          </Link>
          <Link href="/privacy-policy" className="hover:text-zinc-900">
            Privacy Policy
          </Link>
          <Link href="/cookie-policy" className="hover:text-zinc-900">
            Cookie Policy
          </Link>
          <a href="mailto:info@freesbe.it" className="hover:text-zinc-900">
            info@freesbe.it
          </a>
        </nav>
      </div>
    </footer>
  );
}
