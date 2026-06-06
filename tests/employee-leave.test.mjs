import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatLeavePeriod,
  canAccessDashboard,
  normalizeLeavePayload,
  normalizeStatusDetailPayload,
} from "../src/lib/employee-leave.mjs";

test("formatLeavePeriod shows a dated leave range", () => {
  assert.equal(
    formatLeavePeriod({ start_date: "2026-06-10", end_date: "2026-06-20" }),
    "10 Juni 2026 - 20 Juni 2026"
  );
});

test("normalizeLeavePayload requires dates when status is CUTI", () => {
  const formData = new FormData();
  formData.set("active_status", "CUTI");

  assert.deepEqual(normalizeLeavePayload(formData), {
    error: "Tanggal mulai dan selesai cuti wajib diisi.",
  });
});

test("normalizeLeavePayload clears leave fields for non-CUTI status", () => {
  const formData = new FormData();
  formData.set("active_status", "AKTIF");
  formData.set("leave_start_date", "2026-06-10");
  formData.set("leave_end_date", "2026-06-20");
  formData.set("leave_reason", "Sakit");

  assert.deepEqual(normalizeLeavePayload(formData), {
    data: null,
  });
});

test("normalizeLeavePayload rejects an end date before the start date", () => {
  const formData = new FormData();
  formData.set("active_status", "CUTI");
  formData.set("leave_start_date", "2026-06-20");
  formData.set("leave_end_date", "2026-06-10");

  assert.deepEqual(normalizeLeavePayload(formData), {
    error: "Tanggal selesai cuti tidak boleh sebelum tanggal mulai.",
  });
});

test("normalizeLeavePayload returns clean leave data for CUTI status", () => {
  const formData = new FormData();
  formData.set("active_status", "CUTI");
  formData.set("leave_start_date", "2026-06-10");
  formData.set("leave_end_date", "2026-06-20");
  formData.set("leave_reason", " Sakit ");

  assert.deepEqual(normalizeLeavePayload(formData), {
    data: {
      start_date: "2026-06-10",
      end_date: "2026-06-20",
      reason: "Sakit",
    },
  });
});

test("normalizeStatusDetailPayload stores cuti period and note", () => {
  const formData = new FormData();
  formData.set("active_status", "CUTI");
  formData.set("leave_start_date", "2026-06-10");
  formData.set("leave_end_date", "2026-06-20");
  formData.set("leave_reason", " Sakit ");

  assert.deepEqual(normalizeStatusDetailPayload(formData), {
    data: {
      active_status_start_date: "2026-06-10",
      active_status_end_date: "2026-06-20",
      active_status_note: "Sakit",
    },
  });
});

test("normalizeStatusDetailPayload requires resign date", () => {
  const formData = new FormData();
  formData.set("active_status", "RESIGN");

  assert.deepEqual(normalizeStatusDetailPayload(formData), {
    error: "Tanggal resign wajib diisi.",
  });
});

test("normalizeStatusDetailPayload stores final status date", () => {
  const formData = new FormData();
  formData.set("active_status", "DIBERHENTIKAN");
  formData.set("status_effective_date", "2026-07-01");
  formData.set("status_note", " Kontrak berakhir ");

  assert.deepEqual(normalizeStatusDetailPayload(formData), {
    data: {
      active_status_start_date: "2026-07-01",
      active_status_end_date: null,
      active_status_note: "Kontrak berakhir",
    },
  });
});

test("normalizeStatusDetailPayload clears detail fields for aktif", () => {
  const formData = new FormData();
  formData.set("active_status", "AKTIF");
  formData.set("status_effective_date", "2026-07-01");
  formData.set("status_note", "Ignored");

  assert.deepEqual(normalizeStatusDetailPayload(formData), {
    data: {
      active_status_start_date: null,
      active_status_end_date: null,
      active_status_note: null,
    },
  });
});

test("canAccessDashboard allows aktif and cuti only", () => {
  assert.equal(canAccessDashboard("AKTIF"), true);
  assert.equal(canAccessDashboard("CUTI"), true);
  assert.equal(canAccessDashboard("NONAKTIF"), false);
  assert.equal(canAccessDashboard("RESIGN"), false);
  assert.equal(canAccessDashboard("DIBERHENTIKAN"), false);
  assert.equal(canAccessDashboard("PENSIUN"), false);
});
