export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[rgb(var(--muted)/0.7)] bg-[rgb(var(--bg-elev)/0.72)] px-2.5 py-1 text-xs text-[rgb(var(--subtext))] transition hover:border-[rgb(var(--ring)/0.4)] hover:text-[rgb(var(--text))]">{children}</span>;
}
