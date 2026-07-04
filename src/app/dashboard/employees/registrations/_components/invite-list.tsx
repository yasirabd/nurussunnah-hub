"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type Invite = {
  id: string;
  code: string;
  status: "AKTIF" | "TERPAKAI" | "KEDALUWARSA";
  expires_at: string;
  created_at: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function InviteList({ invites }: { invites: Invite[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  async function copyLink(code: string) {
    const link = `${window.location.origin}/register?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      window.prompt("Salin tautan pendaftaran:", link);
    }
  }

  // Hanya tampilkan kode yang masih aktif (belum dipakai & belum kedaluwarsa).
  const active = invites.filter(
    (inv) => inv.status === "AKTIF" && new Date(inv.expires_at).getTime() > nowMs
  );

  if (active.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed py-8 text-center text-sm text-muted-foreground">
        Belum ada kode undangan aktif. Buat kode baru lalu bagikan tautannya.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {active.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border bg-background p-3"
        >
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <code className="font-mono text-sm font-semibold tracking-wide">{inv.code}</code>
          </div>
          <span className="text-xs text-muted-foreground">Berlaku sampai {fmt(inv.expires_at)}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => copyLink(inv.code)}
          >
            {copied === inv.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === inv.code ? "Tersalin" : "Salin Tautan"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
