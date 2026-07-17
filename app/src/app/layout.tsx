import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoteRight — Montgomery County, MD",
  description:
    "Matched to what you actually want: sourced candidate positions, real voting records, published methodology.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
