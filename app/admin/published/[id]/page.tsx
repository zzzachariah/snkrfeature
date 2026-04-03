/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminPublishedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [note, setNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [shoe, setShoe] = useState<any>({});
  const [spec, setSpec] = useState<any>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/shoes/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(true);
      setMessage(json.message ?? "Could not load record.");
      setLoading(false);
      return;
    }

    setData(json);
    setShoe(json.shoe ?? {});
    setSpec(json.spec ?? {});
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function act(action: "update" | "publish" | "unpublish") {
    setMessage("");
    setError(false);

    const res = await fetch(`/api/admin/shoes/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note, shoe, spec })
    });

    const json = await res.json();
    setError(!res.ok || !json.ok);
    setMessage(json.message ?? (json.ok ? "Done." : "Action failed."));
    if (res.ok && json.ok) {
      setShowConfirm(false);
      await load();
    }
  }

  if (loading) return <Card className="p-5">Loading published record...</Card>;
  if (!data) return <Card className="p-5">Record unavailable.</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-lg font-semibold">Live record editing workspace</h2>
        <p className="text-sm soft-text">You are editing a published sneaker record. Changes apply directly to official tables.</p>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="mb-1 block text-xs soft-text">Shoe name</label><Input value={shoe.shoe_name ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, shoe_name: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Brand</label><Input value={shoe.brand ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, brand: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Model line</label><Input value={shoe.model_line ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, model_line: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Version</label><Input value={shoe.version_name ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, version_name: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Release year</label><Input type="number" value={shoe.release_year ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, release_year: Number(e.target.value) || null }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Category</label><Input value={shoe.category ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, category: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Player</label><Input value={shoe.player ?? ""} onChange={(e) => setShoe((p: any) => ({ ...p, player: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs soft-text">Traction</label><Input value={spec.traction ?? ""} onChange={(e) => setSpec((p: any) => ({ ...p, traction: e.target.value }))} /></div>
        </div>

        <div>
          <label className="mb-1 block text-xs soft-text">Audit note</label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for live record change" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => act("update")}>Update published record</Button>
          {data.shoe.is_published ? (
            <Button variant="ghost" className="border border-red-500/35 text-red-500 hover:bg-red-500/10" onClick={() => setShowConfirm(true)}>Unpublish</Button>
          ) : (
            <Button variant="secondary" onClick={() => act("publish")}>Republish</Button>
          )}
        </div>

        {showConfirm && (
          <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm">
            <p>Unpublish this live record? It will be hidden from public listing until republished.</p>
            <div className="mt-2 flex gap-2">
              <Button className="bg-red-500 hover:bg-red-500/80" onClick={() => act("unpublish")}>Confirm unpublish</Button>
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {message && <p className={`text-sm ${error ? "text-red-500" : "text-emerald-500"}`}>{message}</p>}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold">Audit history</h3>
        <div className="mt-3 space-y-2">
          {(data.history ?? []).map((row: any) => (
            <div key={row.id} className="rounded-lg border border-[rgb(var(--muted)/0.35)] p-3">
              <div className="text-xs soft-text">{new Date(row.created_at).toLocaleString()} • {row.action} • by {Array.isArray(row.profiles) ? row.profiles[0]?.username : row.profiles?.username ?? "unknown"}</div>
              {row.note && <p className="mt-1 text-sm">{row.note}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
