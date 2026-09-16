'use client';

export default function PolicyError({ reset }: { reset: () => void }) {
  return <div role="alert" className="space-y-4 rounded-xl border p-6"><h2 className="text-lg font-semibold">Dokumen belum dapat dimuat</h2><p>Coba lagi beberapa saat kemudian.</p><button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Coba lagi</button></div>;
}
