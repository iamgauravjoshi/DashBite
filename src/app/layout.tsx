import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartMess — Mess & Tiffin Management",
  description: "Hybrid marketplace + SaaS for messes, tiffin centers, and home kitchens."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: "1px solid var(--border-subtle)", padding: "16px 24px" }}>
          <strong>SmartMess</strong>
          <span style={{ marginLeft: 12, color: "var(--text-secondary)" }}>
            Phase 0 foundation — full shell lands in Phase 1
          </span>
        </header>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>{children}</main>
      </body>
    </html>
  );
}
