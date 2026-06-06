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
              document.documentElement.classList.remove("dark", "osu");
              if (theme === "osu") {
                document.documentElement.classList.add("dark", "osu");
              } else if (theme === "dark") {
                document.documentElement.classList.add("dark");
              }
              } catch (_) {}
            `,
          }}
        />
      <style dangerouslySetInnerHTML={{ __html: `
        html.osu {
          --background: #111111;
          --foreground: #ffffff;
        }
        html.osu .bg-gray-900, html.osu .dark\\:bg-gray-900 { background-color: #1a171a !important; }
        html.osu .bg-gray-800, html.osu .dark\\:bg-gray-800 { background-color: #262024 !important; }
        html.osu .bg-gray-700, html.osu .dark\\:bg-gray-700 { background-color: #382e32 !important; }
        html.osu .border-gray-800, html.osu .dark\\:border-gray-800 { border-color: #33292d !important; }
        html.osu .border-gray-700, html.osu .dark\\:border-gray-700 { border-color: #403439 !important; }
        html.osu .border-gray-600, html.osu .dark\\:border-gray-600 { border-color: #52434a !important; }
        
        html.osu .text-pink-400, html.osu .dark\\:text-pink-400 { color: #ff66aa !important; }
        html.osu .text-pink-500, html.osu .dark\\:text-pink-500 { color: #ff66aa !important; }
        html.osu .bg-pink-600, html.osu .dark\\:bg-pink-600 { background-color: #ff66aa !important; }
        html.osu .hover\\:bg-pink-700:hover, html.osu .dark\\:hover\\:bg-pink-700:hover { background-color: #e55c99 !important; }
        html.osu .border-pink-500, html.osu .focus\\:border-pink-500:focus { border-color: #ff66aa !important; }
        html.osu .ring-pink-500, html.osu .focus\\:ring-pink-500:focus { --tw-ring-color: #ff66aa !important; }
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
