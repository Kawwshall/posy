import Link from "next/link";
import { Mark } from "./Mark";

export function Nav() {
  return (
    <header className="topbar sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <Mark className="h-6 w-6" />
          <span className="font-display text-xl tracking-tight">Posy</span>
        </Link>
        <nav className="flex items-center gap-1 text-[15px]">
          <Link href="/demo" className="rounded-lg px-3 py-2 text-muted transition hover:text-ink">
            Try it
          </Link>
          <Link href="/dashboard" className="hidden rounded-lg px-3 py-2 text-muted transition hover:text-ink sm:block">
            How the money works
          </Link>
          <Link
            href="/demo"
            className="ml-1 rounded-lg bg-ink px-4 py-2 text-[15px] font-medium text-paper transition hover:bg-black"
          >
            Ask Posy
          </Link>
        </nav>
      </div>
    </header>
  );
}
