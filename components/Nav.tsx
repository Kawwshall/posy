import Link from "next/link";
import { Mark } from "./Mark";
import { AuthButton } from "./AuthButton";

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
            Web demo
          </Link>
          <AuthButton />
          <a
            href="sms:+16462395308?body=Activate"
            className="ml-1 rounded-lg bg-ink px-4 py-2 text-[15px] font-medium text-paper transition hover:bg-black"
          >
            Text Posy
          </a>
        </nav>
      </div>
    </header>
  );
}
