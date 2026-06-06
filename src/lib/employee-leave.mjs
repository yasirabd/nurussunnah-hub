const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function value(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function isIsoDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function formatDateId(date) {
  if (!isIsoDate(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS_ID[month - 1]} ${year}`;
}

export function formatLeavePeriod(leave) {
  if (!leave?.start_date || !leave?.end_date) return "";
  return `${formatDateId(leave.start_date)} - ${formatDateId(leave.end_date)}`;
}

export function normalizeLeavePayload(formData) {
  if (value(formData, "active_status") !== "CUTI") {
    return { data: null };
  }

  const startDate = value(formData, "leave_start_date");
  const endDate = value(formData, "leave_end_date");
  const reason = value(formData, "leave_reason");

  if (!startDate || !endDate) {
    return { error: "Tanggal mulai dan selesai cuti wajib diisi." };
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return { error: "Format tanggal cuti tidak valid." };
  }

  if (endDate < startDate) {
    return { error: "Tanggal selesai cuti tidak boleh sebelum tanggal mulai." };
  }

  return {
    data: {
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    },
  };
}

export function normalizeStatusDetailPayload(formData) {
  const status = value(formData, "active_status");

  if (status === "CUTI") {
    const leave = normalizeLeavePayload(formData);
    if (leave.error) return leave;
    return {
      data: {
        active_status_start_date: leave.data.start_date,
        active_status_end_date: leave.data.end_date,
        active_status_note: leave.data.reason,
      },
    };
  }

  if (status === "NONAKTIF") {
    return {
      data: {
        active_status_start_date: null,
        active_status_end_date: null,
        active_status_note: value(formData, "status_note") || null,
      },
    };
  }

  const labels = {
    RESIGN: "Tanggal resign wajib diisi.",
    DIBERHENTIKAN: "Tanggal diberhentikan wajib diisi.",
    PENSIUN: "Tanggal mulai pensiun wajib diisi.",
  };

  if (Object.hasOwn(labels, status)) {
    const effectiveDate = value(formData, "status_effective_date");
    if (!effectiveDate) return { error: labels[status] };
    if (!isIsoDate(effectiveDate)) return { error: "Format tanggal status tidak valid." };
    return {
      data: {
        active_status_start_date: effectiveDate,
        active_status_end_date: null,
        active_status_note: value(formData, "status_note") || null,
      },
    };
  }

  return {
    data: {
      active_status_start_date: null,
      active_status_end_date: null,
      active_status_note: null,
    },
  };
}

export function canAccessDashboard(activeStatus) {
  return activeStatus === "AKTIF" || activeStatus === "CUTI";
}
