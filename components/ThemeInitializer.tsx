"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    const theme = document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || "dark";
    document.documentElement.classList.remove("dark", "osu");
    if (theme === "osu") {
      document.documentElement.classList.add("dark", "osu");
    } else if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }); // No dependency array ensures it re-syncs when the layout revalidates
  return null;
}