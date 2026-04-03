import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07090f",
        surface: "#111726",
        muted: "#161d2f",
        accent: "#7c5cff",
        text: "#eef1fb",
        subtext: "#96a1bd"
      },
      boxShadow: {
        glow: "0 0 40px rgba(124, 92, 255, 0.25)"
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
} satisfies Config;
