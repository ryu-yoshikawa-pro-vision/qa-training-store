import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scenario Shop",
  description: "QA Training Store (Scenario Shop) featuring product catalog, cart, checkout simulation, orders, and interactive QA test controls.",
  openGraph: {
    title: "Scenario Shop",
    description: "QA Training Store (Scenario Shop) featuring product catalog, cart, checkout simulation, orders, and interactive QA test controls.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
