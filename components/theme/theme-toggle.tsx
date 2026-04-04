"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Laptop } from "lucide-react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "system") {
    localStorage.removeItem("theme");
    return;
  }
  root.classList.add(theme);
  localStorage.setItem("theme", theme);
}

const cycleOrder: Theme[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function cycleTheme() {
    const index = cycleOrder.indexOf(theme);
    const next = cycleOrder[(index + 1) % cycleOrder.length];
    setTheme(next);
    applyTheme(next);
  }

  const icon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Laptop className="h-4 w-4" />;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--glass-bg)/0.62)] px-2 py-1 text-xs text-[rgb(var(--text))] shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.28)] transition hover:border-[rgb(var(--ring)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)]"
      aria-label={`Theme: ${theme}. Click to cycle theme.`}
      title={`Theme: ${theme}`}
    >
      {icon}
      <span className="hidden sm:inline capitalize">{theme}</span>
    </button>
  );
}

export function ThemeInitScript() {
  const code = `(() => { try { const t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.classList.add(t); } catch (e) {} })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
