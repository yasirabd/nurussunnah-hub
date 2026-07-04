"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Invite = {
  id: string;
  code: string;
  status: "AKTIF" | "TERPAKAI" | "KEDALUWARSA";
  expires_at: string;
  created_at: string;
};

const STATUS_LABEL: Record<Invite["status"], string> = {
  AKTIF: "Aktif",
  TERPAKAI: "Terpakai",
  KEDALUWARSA: "Kedaluwarsa",
};

function statusVariant(s: Invite["status"]): "default" | "secondary" | "outline" {
  if (s === "AKTIF") return "default";
  if (s === "TERPAKAI") return "secondary";
  return "outline";
}

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

  if (invites.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada kode undangan.</p>;
  }

  return (
    <ul className="divide-y">
      {invites.map((inv) => {
        const effective =
          inv.status === "AKTIF" && new Date(inv.expires_at).getTime() <= nowMs
            ? "KEDALUWARSA"
            : inv.status;
        return (
        <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{inv.code}</code>
          <Badge variant={statusVariant(effective)}>{STATUS_LABEL[effective]}</Badge>
          <span className="text-xs text-muted-foreground">
            Kedaluwarsa {fmt(inv.expires_at)}
          </span>
          {effective === "AKTIF" && (
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
          )}
        </li>
        );
      })}
    </ul>
  );
}
