import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-void px-6 text-center">
      <Logo size={56} />
      <div>
        <h1 className="font-display text-6xl font-extrabold text-gradient">404</h1>
        <p className="mt-3 text-sm text-white/60">
          This deal doesn&apos;t exist (or it already sold out).
        </p>
      </div>
      <Link
        href="/"
        className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 cta-glow"
      >
        Back to the deal stream
      </Link>
    </div>
  );
}
