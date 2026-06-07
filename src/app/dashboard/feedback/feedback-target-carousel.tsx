"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquareMore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "./actions";

export type FeedbackTarget = {
  receiver_user_id: string;
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  unit_code: string | null;
  rating: number | null;
  feedback_text: string | null;
  is_completed: boolean;
  feedback_id: string | null;
};

export function FeedbackTargetCarousel({
  targets,
  academicYearId,
  isMultiUnit = false,
}: {
  targets: FeedbackTarget[];
  academicYearId: string;
  isMultiUnit?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTarget = targets[activeIndex];
  const completedCount = useMemo(
    () => targets.filter((target) => target.is_completed).length,
    [targets]
  );

  if (!targets.length || !activeTarget) {
    return (
      <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
        Belum ada target feedback untuk akun ini.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            Rekan {activeIndex + 1} dari {targets.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{targets.length} feedback selesai
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={activeTarget.receiver_user_id}
            onValueChange={(value) => {
              const nextIndex = targets.findIndex(
                (target) => target.receiver_user_id === value
              );
              if (nextIndex >= 0) setActiveIndex(nextIndex);
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <span className="truncate text-left">{activeTarget.full_name}</span>
            </SelectTrigger>
            <SelectContent>
              {targets.map((target) => (
                <SelectItem key={target.receiver_user_id} value={target.receiver_user_id}>
                  {target.full_name} - {target.unit_name ?? "Tanpa unit"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Rekan sebelumnya"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Rekan berikutnya"
              disabled={activeIndex === targets.length - 1}
              onClick={() =>
                setActiveIndex((index) => Math.min(targets.length - 1, index + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <FeedbackTargetCard
        key={activeTarget.receiver_user_id}
        target={activeTarget}
        academicYearId={academicYearId}
        isMultiUnit={isMultiUnit}
      />
    </div>
  );
}

function FeedbackTargetCard({
  target,
  academicYearId,
  isMultiUnit = false,
}: {
  target: FeedbackTarget;
  academicYearId: string;
  isMultiUnit?: boolean;
}) {
  return (
    <form action={submitFeedbackAction} className="rounded-[var(--radius-lg)] border bg-card p-4 elevation-1">
      <input type="hidden" name="academic_year_id" value={academicYearId} />
      <input type="hidden" name="receiver_user_id" value={target.receiver_user_id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">
            {target.full_name}
            {isMultiUnit && target.unit_code && (
              <span className="ml-2 inline-flex items-center rounded-sm border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {target.unit_code}
              </span>
            )}
          </h2>
            {target.is_completed && (
              <Badge className="border-0 bg-primary/10 text-primary">
                Selesai
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {target.employee_no} - {target.unit_name ?? "-"}
          </p>
        </div>
        <div className="w-full sm:w-32">
          <Label htmlFor={`rating-${target.receiver_user_id}`}>Rating</Label>
          <select
            id={`rating-${target.receiver_user_id}`}
            name="rating"
            defaultValue={target.rating ?? 5}
            className="mt-2 h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`feedback-${target.receiver_user_id}`}>Catatan feedback</Label>
        <Textarea
          id={`feedback-${target.receiver_user_id}`}
          name="feedback_text"
          defaultValue={target.feedback_text ?? ""}
          placeholder="Tuliskan apresiasi, masukan, atau catatan kerja yang relevan."
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm">
          <MessageSquareMore className="h-4 w-4" />
          {target.is_completed ? "Perbarui feedback" : "Kirim feedback"}
        </Button>
      </div>
    </form>
  );
}
