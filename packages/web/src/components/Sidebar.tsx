"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  Network,
  Lightbulb,
  Archive,
  Menu,
  X,
  LibraryBig
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/recommend", label: "Recommend", icon: Lightbulb },
  { href: "/archive", label: "Archive", icon: Archive },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 rounded-md bg-[var(--color-sidebar)] p-2 text-white shadow-lg md:hidden hover:bg-[var(--color-sidebar-hover)] transition-colors"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-40 flex h-full w-64 flex-col",
          "bg-[var(--color-sidebar)] text-white shadow-xl transition-transform duration-300 ease-in-out",
          "md:translate-x-0 border-r border-slate-700/50",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <LibraryBig className="text-[var(--color-primary)]" size={28} />
          <span className="text-lg font-bold tracking-tight">Paper Tools</span>
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--color-primary)] text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-white hover:pl-4"
                )}
              >
                <Icon size={20} className={clsx("transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Project</div>
          <div className="text-xs text-slate-400">
            paper-tools web v0.1.0
          </div>
        </div>
      </aside>
    </>
  );
}
