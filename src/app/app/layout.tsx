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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // The drill runner owns the full viewport; the chrome stays out of its way.
  const isDrilling = pathname === "/app/drill";

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 85%, transparent)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 flex-none group">
            <span
              className="h-7 w-7 rounded-lg flex items-center justify-center text-[13px] font-bold transition-transform group-hover:scale-105"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              R
            </span>
            <span className="font-semibold text-[15px] tracking-tight" style={{ color: "var(--text)" }}>
              Reps
            </span>
          </Link>

          {!isDrilling && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((link) => {
                const active = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors"
                    )}
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
                className="md:hidden px-2 py-1.5 rounded-lg text-[13px]"
                style={{ color: "var(--text-muted)", background: "var(--surface)" }}
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label="Menu"
              >
                ☰
              </button>
            )}
          </div>
        </div>

        {menuOpen && !isDrilling && (
          <nav className="md:hidden border-t px-4 py-2 flex flex-col" style={{ borderColor: "var(--border)" }}>
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 text-[14px]"
                style={{ color: "var(--text-muted)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <div className={cn("mx-auto px-4 py-6", isDrilling ? "max-w-3xl" : "max-w-5xl")}>
          {children}
        </div>
      </main>
    </div>
  );
}

// The theme lives on <html data-theme>, which is external to React —
// an inline script sets it before paint to avoid a flash. Reading it
// with useSyncExternalStore keeps the button in sync without the
// setState-in-effect cascade.
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
      aria-label="Toggle theme"
      className="h-8 w-8 rounded-lg flex items-center justify-center text-[13px] transition-colors"
      style={{ background: "var(--surface)", color: "var(--text-muted)" }}
    >
      {light ? "☾" : "☀"}
    </button>
  );
}
