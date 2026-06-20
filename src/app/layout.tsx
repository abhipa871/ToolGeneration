import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma Chat",
  description: "A calm, provider-agnostic workspace for open models.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
