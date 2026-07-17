import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoteRight — Montgomery County, MD",
  description:
    "Matched to what you actually want: sourced candidate positions, real voting records, published methodology.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { color: "#f4f4f3" },
  ],
};

// Apply a saved manual theme before first paint so there's no flash.
const THEME_BOOT = `try{var t=localStorage.getItem("vr-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <div className="shell">{children}</div>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
