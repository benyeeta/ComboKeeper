"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    const theme = document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || "dark";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }); // No dependency array ensures it re-syncs when the layout revalidates
  return null;
}