import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SmartMess — Mess & Tiffin Management",
    template: "%s · SmartMess"
  },
  description: "Hybrid marketplace + SaaS for messes, tiffin centers, and home kitchens."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
