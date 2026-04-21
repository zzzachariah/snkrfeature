export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-[rgb(var(--glass-stroke-soft)/0.4)] bg-[rgb(var(--muted)/0.35)] px-2 py-[3px] text-[0.67rem] text-[rgb(var(--subtext))] transition hover:border-[rgb(var(--text)/0.35)] hover:text-[rgb(var(--text))]">
      {children}
    </span>
  );
}
