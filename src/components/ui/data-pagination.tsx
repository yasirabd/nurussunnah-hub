"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type DataPaginationProps = {
  basePath: string;
  searchParams: Record<string, string>;
  pageParam: string;
  pageSizeParam: string;
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
};

const pageSizes = [10, 25, 50] as const;

export function DataPagination({
  basePath,
  searchParams,
  pageParam,
  pageSizeParam,
  page,
  pageSize,
  total,
  itemLabel,
}: DataPaginationProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  function push(next: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === "success" || key === "error") return;
      if (value) params.set(key, value);
    });
    params.set(pageParam, String(next.page ?? currentPage));
    params.set(pageSizeParam, String(next.pageSize ?? pageSize));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {from}-{to} dari {total} {itemLabel}
        </span>
        <span className="hidden sm:inline">-</span>
        <label className="flex items-center gap-2">
          Tampilkan
          <select
            value={pageSize}
            onChange={(event) => push({ page: 1, pageSize: Number(event.target.value) })}
            className="h-8 rounded-[var(--radius-sm)] border border-input bg-background px-2 text-sm text-foreground"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => push({ page: 1 })} aria-label="Halaman pertama">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => push({ page: currentPage - 1 })} aria-label="Halaman sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-24 text-center text-sm text-muted-foreground">
          {currentPage} / {totalPages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => push({ page: currentPage + 1 })} aria-label="Halaman berikutnya">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => push({ page: totalPages })} aria-label="Halaman terakhir">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
