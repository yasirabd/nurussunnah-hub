"use client";

import { DataPagination } from "@/components/ui/data-pagination";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string>;
};

export function PaginationControls({ page, pageSize, total, searchParams }: PaginationControlsProps) {
  return (
    <DataPagination
      basePath="/dashboard/employees"
      searchParams={searchParams}
      pageParam="page"
      pageSizeParam="pageSize"
      page={page}
      pageSize={pageSize}
      total={total}
      itemLabel="pegawai"
    />
  );
}
