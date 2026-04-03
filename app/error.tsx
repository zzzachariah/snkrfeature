"use client";

export default function Error({ error }: { error: Error }) {
  return <main className="container-shell py-10"><div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">Something went wrong: {error.message}</div></main>;
}
