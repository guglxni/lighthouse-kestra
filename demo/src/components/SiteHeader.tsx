"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingHoverCard } from "@/components/ui/floating-card";

const navItems = [
  { href: "/", label: "Home", public: true, tip: "Overview, topic previews, and the one-minute setup." },
  { href: "/dashboard", label: "Dashboard", auth: true, tip: "Your live status panel, brief generator, and topic selector." },
  { href: "/tech", label: "Under the hood", public: true, tip: "Full pipeline architecture, Kestra flows, and open-source credits." },
  { href: "/settings", label: "Settings", auth: true, tip: "AI provider keys, delivery webhooks, and default topic." },
];

export function SiteHeader({ initialEmail }: { initialEmail: string | null }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled ? "border-b border-white/5 bg-ink-950/80 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="group">
          <Image
            src="/branding/logo-lockup-clean.png"
            alt="Lighthouse"
            width={1461}
            height={822}
            className="h-12 w-auto transition-opacity group-hover:opacity-90"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems
            .filter((n) => (n.auth ? Boolean(email) : true))
            .map((n) => (
              <FloatingHoverCard
                key={n.href}
                placement="bottom"
                trigger={
                  <Link
                    href={n.href}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition",
                      pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href))
                        ? "bg-white/10 text-ink-50"
                        : "text-ink-300 hover:bg-white/5 hover:text-ink-50",
                    )}
                  >
                    {n.label}
                  </Link>
                }
              >
                <p className="text-xs text-ink-300">{n.tip}</p>
              </FloatingHoverCard>
            ))}
        </nav>
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden text-xs text-ink-400 sm:inline">{email}</span>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-xs text-ink-200 hover:text-ink-50 sm:inline"
              >
                Sign in
              </Link>
              <Button size="sm" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
