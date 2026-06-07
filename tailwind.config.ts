import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-main)",
        surface: "var(--bg-surface)",
        "border-main": "var(--border-main)",
        content: "var(--text-main)",
        muted: "var(--text-muted)",
        accent: "var(--accent-main)",
        "hover-overlay": "var(--hover-overlay)",
      },
    },
  },
  plugins: [],
};

export default config;