"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

type ReceivedFeedback = {
  rating: number;
  feedback_text: string | null;
};

export function DownloadFeedbackExcel({
  data,
  yearName,
}: {
  data: ReceivedFeedback[];
  yearName: string;
}) {
  function handleDownload() {
    const rows = data.map((item) => ({
      Rating: item.rating,
      Feedback: item.feedback_text || "Tanpa catatan tertulis.",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 8 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feedback Masuk");
    XLSX.writeFile(wb, `feedback-masuk-${yearName}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
    >
      <Download className="h-3.5 w-3.5" />
      Excel
    </button>
  );
}
