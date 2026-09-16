'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Button } from '@/components/ui/button';

export function PdfReader({ src, title }: { src: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  // ponytail: one page in memory; add virtualization only if continuous scrolling is required.
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageText, setPageText] = useState('');

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined;
    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        task = pdfjs.getDocument({
          url: src,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          wasmUrl: '/pdfjs/wasm/',
        });
        const pdf = await task.promise;
        if (!cancelled) setDocument(pdf);
      } catch {
        if (!cancelled) { setError('PDF belum dapat dibuka. Coba lagi atau unduh berkasnya.'); setLoading(false); }
      }
    }
    void load();
    return () => { cancelled = true; void task?.destroy(); };
  }, [src, retry]);

  useEffect(() => {
    if (!document || !width || !canvas.current) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    const target = canvas.current;
    async function draw() {
      setLoading(true);
      setError('');
      try {
        const pdfPage = await document!.getPage(page);
        if (cancelled) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const scale = width / original.width;
        const viewport = pdfPage.getViewport({ scale: scale * Math.min(window.devicePixelRatio || 1, 2) });
        target.width = Math.floor(viewport.width);
        target.height = Math.floor(viewport.height);
        target.style.width = `${width}px`;
        target.style.height = `${original.height * scale}px`;
        render = pdfPage.render({ canvas: target, viewport });
        await render.promise;
        const text = await pdfPage.getTextContent();
        if (!cancelled) setPageText(text.items.map(item => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join(''));
      } catch {
        if (!cancelled) setError('Halaman PDF gagal ditampilkan. Coba lagi atau unduh berkasnya.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void draw();
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, width]);

  return (
    <section aria-label={`Pembaca PDF: ${title}`} className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={!document || loading || page === 1} onClick={() => setPage(page - 1)} aria-label="Halaman PDF sebelumnya">Sebelumnya</Button><span aria-live="polite" className="text-xs tabular-nums">{document ? `${page} / ${document.numPages}` : 'PDF'}</span><Button variant="outline" size="sm" disabled={!document || loading || page === document.numPages} onClick={() => setPage(page + 1)} aria-label="Halaman PDF berikutnya">Berikutnya</Button></div>
        <a href={`${src}?download=1`} className="text-sm font-medium text-primary underline">Unduh PDF</a>
      </div>
      {loading && <p role="status" className="p-3 text-sm text-muted-foreground">Memuat halaman PDF...</p>}
      {error && <div role="alert" className="space-y-3 p-4"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => { setError(''); setLoading(true); setDocument(null); setPage(1); setRetry(retry + 1); }}>Coba lagi</Button></div>}
      <div ref={container} className="min-h-40 bg-muted"><canvas ref={canvas} className={`block ${loading || error ? 'invisible' : ''}`} role="img" aria-label={`${title}, halaman ${page}`} /></div>
      {!loading && !error && <details className="border-t p-3 text-sm"><summary className="cursor-pointer font-medium">Teks halaman {page}</summary><p className="mt-3 whitespace-pre-wrap">{pageText.trim() || 'Halaman ini berupa gambar atau tidak memiliki teks. Gunakan dokumen sumber yang dapat diakses bila diperlukan.'}</p></details>}
    </section>
  );
}
