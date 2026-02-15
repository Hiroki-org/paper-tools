"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/graph", label: "Graph", icon: "🕸️" },
  { href: "/recommend", label: "Recommend", icon: "💡" },
  { href: "/archive", label: "Archive", icon: "📚" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 rounded-md bg-[var(--color-sidebar)] p-2 text-white md:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 flex h-full w-64 flex-col
          bg-[var(--color-sidebar)] text-white transition-transform
          md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <span className="text-2xl">📄</span>
          <span className="text-lg font-bold tracking-tight">Paper Tools</span>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${
                    active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-slate-300 hover:bg-[var(--color-sidebar-hover)] hover:text-white"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-400">
          paper-tools web
        </div>
      </aside>
    </>
  );
}
