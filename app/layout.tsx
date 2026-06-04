import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Header } from "@/components/Header";
import { Suspense } from "react";
import ThemeInitializer from "@/components/ThemeInitializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComboKeeper",
  description: "Tournament score tracking for osu!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || "dark";
                if (theme === "dark") document.documentElement.classList.add("dark");
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <Suspense fallback={<header className="h-[73px] flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200" />}>
          <Header />
        </Suspense>
        <ThemeInitializer />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
