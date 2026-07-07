import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Lead Importer — GrowEasy",
  description: "AI-powered CSV importer that maps any lead export into GrowEasy CRM format.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-ink" suppressHydrationWarning>{children}</body>
    </html>
  );
}
