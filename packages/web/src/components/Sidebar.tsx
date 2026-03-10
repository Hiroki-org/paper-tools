"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Search,
  UserRoundSearch,
  Network,
  Lightbulb,
  Archive,
  Settings,
  LogOut,
  Menu,
  X,
  LibraryBig,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/authors", label: "Author Profiler", icon: UserRoundSearch },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/recommend", label: "Recommend", icon: Lightbulb },
  { href: "/archive", label: "Archive", icon: Archive },
];

interface SidebarProps {
  hidden?: boolean;
}

export default function Sidebar({ hidden = false }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", open);
    return () => {
      document.body.classList.remove("sidebar-open");
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (hidden) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-200 bg-white/90 p-2.5 text-slate-700 shadow-lg backdrop-blur md:hidden"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="app-sidebar"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div
        className={clsx(
          "fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="app-sidebar"
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition-transform duration-300 ease-out",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/10 p-2.5 ring-1 ring-white/10">
              <LibraryBig className="text-blue-300" size={24} />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">
                Paper Tools
              </p>
              <p className="text-xs text-slate-400">Research workspace</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5">
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
                  "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white ring-1 ring-white/10"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon
                  size={18}
                  className={clsx(
                    "transition-colors",
                    active
                      ? "text-blue-200"
                      : "text-slate-400 group-hover:text-white",
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>

            <div className="mt-3 space-y-2">
              <Link
                href="/setup"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                <Settings size={14} />
                DB を変更
              </Link>

              <a
                href="https://www.notion.so/my-connections"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                <Shield size={14} />
                アクセスを管理
              </a>

              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                >
                  <LogOut size={14} />
                  ログアウト
                </button>
              </form>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
              <div className="font-medium text-slate-300">paper-tools web</div>
              <div className="mt-1">Version 0.1.0</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
