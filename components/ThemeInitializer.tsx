"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    const theme = document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || "default";
    document.documentElement.classList.remove("dark", "default");
    if (theme === "default") {
      document.documentElement.classList.add("dark", "default");
    } else if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }); // No dependency array ensures it re-syncs when the layout revalidates
  return null;
}