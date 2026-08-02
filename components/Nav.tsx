import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-black/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-posy-600 text-white shadow-sm">
            🌸
          </span>
          <span className="text-lg tracking-tight">Posy</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/demo" className="rounded-lg px-3 py-2 text-black/70 hover:bg-black/5">
            Try the demo
          </Link>
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-black/70 hover:bg-black/5">
            Trust dashboard
          </Link>
          <Link
            href="/demo"
            className="rounded-lg bg-ink px-3.5 py-2 text-white hover:bg-black"
          >
            Text Posy →
          </Link>
        </nav>
      </div>
    </header>
  );
}
