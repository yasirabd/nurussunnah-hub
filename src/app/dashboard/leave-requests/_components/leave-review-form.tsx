"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewLeaveRequestAction } from "../actions";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function LeaveReviewForm({
  id,
  currentStatus,
  currentNote,
}: {
  id: string;
  currentStatus: string;
  currentNote: string | null;
}) {
  return (
    <form action={reviewLeaveRequestAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={currentStatus} className={selectCls}>
        <option value="MENUNGGU">Menunggu</option>
        <option value="DISETUJUI">Disetujui</option>
        <option value="DITOLAK">Ditolak</option>
        <option value="PERLU_REVISI">Perlu Revisi</option>
      </select>
      <Textarea
        name="admin_note"
        rows={2}
        placeholder="Catatan admin (opsional)"
        defaultValue={currentNote ?? ""}
      />
      <Button type="submit" size="sm">Simpan</Button>
    </form>
  );
}
