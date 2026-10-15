import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCC NEXUS AI — Your Complete AI Business Growth Platform",
  description:
    "AI-powered lead management, marketing, sales and business intelligence for UAE and Saudi Arabia.",
};

async function LocalizedDocument({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("nexus-lang")?.value === "ar" ? "ar" : "en";
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-screen bg-abyss text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  // cookies() is runtime data: with Cache Components it must live
  // inside its own Suspense boundary (see Next docs on layout.js).
  return (
    <Suspense fallback={null}>
      <LocalizedDocument>{children}</LocalizedDocument>
    </Suspense>
  );
}
