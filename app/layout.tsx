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
                let theme = document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || "default";
              document.documentElement.classList.remove("dark", "default");
              if (theme === "default" || theme === "osu") {
                document.documentElement.classList.add("dark", "default");
              } else if (theme === "dark") {
                document.documentElement.classList.add("dark");
              }
              } catch (_) {}
            `,
          }}
        />
      <style dangerouslySetInnerHTML={{ __html: `
        html.default {
          --background: #111111;
          --foreground: #ffffff;
        }
        html.default body {
          background-color: #111111 !important;
          color: #ffffff !important;
        }
        html.default .bg-gray-900, html.default .dark\\:bg-gray-900 { background-color: #1a171a !important; }
        html.default .bg-gray-800, html.default .dark\\:bg-gray-800 { background-color: #262024 !important; }
        html.default .bg-gray-700, html.default .dark\\:bg-gray-700 { background-color: #382e32 !important; }
        html.default .border-gray-800, html.default .dark\\:border-gray-800 { border-color: #33292d !important; }
        html.default .border-gray-700, html.default .dark\\:border-gray-700 { border-color: #403439 !important; }
        html.default .border-gray-600, html.default .dark\\:border-gray-600 { border-color: #52434a !important; }
        
        html.default .text-pink-400, html.default .dark\\:text-pink-400 { color: #ff66aa !important; }
        html.default .text-pink-500, html.default .dark\\:text-pink-500 { color: #ff66aa !important; }
        html.default .bg-pink-600, html.default .dark\\:bg-pink-600 { background-color: #ff66aa !important; }
        html.default .hover\\:bg-pink-700:hover, html.default .dark\\:hover\\:bg-pink-700:hover { background-color: #fc4496 !important; }
        html.default .border-pink-500, html.default .focus\\:border-pink-500:focus { border-color: #ff66aa !important; }
        html.default .ring-pink-500, html.default .focus\\:ring-pink-500:focus { --tw-ring-color: #ff66aa !important; }
      `}} />
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
