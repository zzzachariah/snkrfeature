export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[linear-gradient(170deg,rgb(var(--glass-highlight)/0.26),rgb(var(--glass-bg)/0.6))] px-2.5 py-1 text-xs text-[rgb(var(--subtext))] shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.28)] transition hover:border-[rgb(var(--ring)/0.4)] hover:text-[rgb(var(--text))]">{children}</span>;
}
