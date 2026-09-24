"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Today", exact: true },
  { href: "/app/path", label: "Roadmap" },
  { href: "/app/cheatsheet", label: "Cheat Sheet" },
  { href: "/app/interview", label: "Mock Interview" },
  { href: "/app/dashboard", label: "Progress" },
  { href: "/app/concepts", label: "Concepts" },
];

function isActive(pathname: string, link: (typeof NAV)[number]) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The menu remembers which page it was opened on, so it closes itself
  // on any navigation (links, back/forward) without an effect.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;

  // The drill runner owns the full viewport; the chrome stays out of its way.
  const isDrilling = pathname === "/app/drill";

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-[14px] focus:font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Skip to content
      </a>

      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 85%, transparent)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 flex-none group rounded-lg" aria-label="Reps home">
            <span
              aria-hidden
              className="h-7 w-7 rounded-lg flex items-center justify-center text-[13px] font-bold transition-transform group-hover:scale-105"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              R
            </span>
            <span
              aria-hidden
              className="font-semibold text-[15px] tracking-tight"
              style={{ color: "var(--text)" }}
            >
              Reps
            </span>
          </Link>

          {!isDrilling && (
            <nav className="hidden md:flex items-center gap-1" aria-label="Main">
              {NAV.map((link) => {
                const active = isActive(pathname, link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap"
                    style={{
                      color: active ? "var(--text)" : "var(--text-muted)",
                      background: active ? "var(--surface)" : "transparent",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {!isDrilling && (
              <button
                type="button"
                className="md:hidden h-9 w-9 rounded-lg text-[15px] flex items-center justify-center"
                style={{ color: "var(--text-muted)", background: "var(--surface)" }}
                onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
              </button>
            )}
          </div>
        </div>

        {menuOpen && !isDrilling && (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="md:hidden border-t px-4 py-2 flex flex-col"
            style={{ borderColor: "var(--border)" }}
          >
            {NAV.map((link) => {
              const active = isActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpenOn(null)}
                  className={cn("py-2.5 text-[14px]", active && "font-medium")}
                  style={{ color: active ? "var(--text)" : "var(--text-muted)" }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className={cn("mx-auto px-4 py-6", isDrilling ? "max-w-3xl" : "max-w-5xl")}>
          {children}
        </div>
      </main>
    </div>
  );
}

// The theme lives on <html data-theme>, which is external to React —
// an inline script in the root layout sets it before paint to avoid a
// flash. Reading it with useSyncExternalStore renders the server
// snapshot (dark) during hydration, then the real value, with no
// mismatch warning and no setState-in-effect.
const themeStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    themeStore.listeners.add(listener);
    return () => themeStore.listeners.delete(listener);
  },
  getSnapshot() {
    return document.documentElement.getAttribute("data-theme") === "light";
  },
  getServerSnapshot() {
    return false;
  },
  set(light: boolean) {
    if (light) document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem("reps-theme", light ? "light" : "dark");
    } catch {
      // Private browsing — the toggle still works for this session.
    }
    for (const listener of themeStore.listeners) listener();
  },
};

function ThemeToggle() {
  const light = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot
  );

  return (
    <button
      type="button"
      onClick={() => themeStore.set(!light)}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      title={light ? "Dark theme" : "Light theme"}
      className="h-9 w-9 rounded-lg flex items-center justify-center text-[14px] transition-colors"
      style={{ background: "var(--surface)", color: "var(--text-muted)" }}
    >
      <span aria-hidden>{light ? "☾" : "☀"}</span>
    </button>
  );
}
