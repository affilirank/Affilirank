import Link from "next/link";
import { Newspaper, Settings, Home, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { SHOW_PRODUCT_PAGE, SITE_NAME } from "@/lib/constants";

/**
 * Simple sticky top nav for the static SEO pages (/blog, /blog/[slug], …).
 * The stream page has its own overlay Header that lives inside the scroller.
 */
export function BlogNav({ active }: { active?: "blog" }) {
  const linkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition",
      isActive
        ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
        : "text-white/60 hover:bg-white/5 hover:text-white"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1e]/95 shadow-lg shadow-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label={`${SITE_NAME} home`} className="shrink-0">
          <span className="hidden sm:inline-flex">
            <Logo size={32} withWordmark />
          </span>
          <span className="sm:hidden">
            <Logo size={30} />
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link href="/" className={linkClass(false)}>
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Deals</span>
          </Link>
          <Link href="/blog" className={linkClass(active === "blog")}>
            <Newspaper className="h-4 w-4" />
            Blog
          </Link>
          {SHOW_PRODUCT_PAGE && (
            <Link href="/affilirank" className={linkClass(false)}>
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Get this</span>
            </Link>
          )}
          <Link href="/admin" className={linkClass(false)}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
