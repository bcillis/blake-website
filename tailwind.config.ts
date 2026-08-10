import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-lora)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        rule: "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-wash": "var(--accent-wash)",
      },
      borderRadius: {
        // Flat, industrial: everything is a 2px corner or a full pill (never used).
        DEFAULT: "2px",
        sm: "2px",
        md: "2px",
        lg: "2px",
      },
      maxWidth: {
        page: "1080px",
        text: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;
