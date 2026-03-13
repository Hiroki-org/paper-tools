"use client";

import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

function shouldHideSidebar(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname === "/privacy" ||
    pathname === "/terms"
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = shouldHideSidebar(pathname ?? "");

  return (
    <>
      <Sidebar hidden={hideSidebar} />
      <main className={clsx("relative min-h-screen", !hideSidebar && "md:ml-64")}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/60 via-white/20 to-transparent"
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </>
  );
}
