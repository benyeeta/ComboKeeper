"use client";

import { useState, useEffect } from "react";

export default function ThemeSelect({
  currentTheme,
  updateTheme
}: {
  currentTheme: string;
  updateTheme: (formData: FormData) => void;
}) {
  const [theme, setTheme] = useState(currentTheme);

  // Keep state perfectly in sync if the server prop changes
  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    
    // Optimistically update the DOM immediately for an instant visual transition!
    document.documentElement.classList.remove("dark", "osu");
    if (newTheme === "osu") {
      document.documentElement.classList.add("dark", "osu");
    } else if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
    
    // Tell the server to save the new cookie
    const formData = new FormData();
    formData.append("theme", newTheme);
    updateTheme(formData);
  };

  return (
    <div className="flex items-center gap-4">
      <select 
        name="theme" 
        value={theme}
        onChange={handleChange}
        className="rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none"
      >
        <option value="dark">Dark Mode</option>
        <option value="light">Light Mode</option>
      <option value="osu">osu! Theme</option>
      </select>
    </div>
  );
}