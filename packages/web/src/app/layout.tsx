import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Paper Tools",
  description: "Academic paper research dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden text-[var(--color-text)]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
