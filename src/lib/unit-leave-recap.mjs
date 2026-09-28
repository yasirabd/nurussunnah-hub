export const LEAVE_CATEGORIES = [
  "Sakit",
  "Keperluan Keluarga",
  "Terlambat/Kendala Perjalanan",
  "Duka Cita (Kedukaan)",
  "Acara Khusus (Wisuda/Pernikahan/Ibadah)",
  "Mudik/Perjalanan Luar Kota",
  "Pendidikan/Akademik",
  "Kedinasan/Tugas Kantor",
  "Administrasi Pribadi",
  "Lainnya",
];

export const LEAVE_DAY_DESCRIPTION = "Hari kalender unik dalam periode, semua status termasuk ditolak. Izin parsial dihitung satu hari. Tanggal bertumpuk dihitung sekali; jumlah antar kategori dapat melebihi total hari.";

function uniqueDays(intervals) {
  let total = 0;
  let lastEnd = -Infinity;
  // Merge overlapping dates without expanding long leave periods into daily rows.
  for (const [start, end] of intervals.sort((a, b) => a[0] - b[0])) {
    total += Math.max(0, end - Math.max(start, lastEnd + 1) + 1);
    lastEnd = Math.max(lastEnd, end);
  }
  return total;
}

export function unitLeaveDayRecap(employees, requests, startDate, endDate) {
  const days = new Map(employees.map((employee) => [employee.user_id, new Map()]));
  const start = Date.parse(startDate) / 86400000;
  const end = Date.parse(endDate) / 86400000;
  for (const request of requests) {
    const categories = days.get(request.user_id);
    if (!categories) continue;
    const interval = [Math.max(start, Date.parse(request.start_date) / 86400000), Math.min(end, Date.parse(request.end_date) / 86400000)];
    if (interval[0] > interval[1]) continue;
    const intervals = categories.get(request.leave_category) ?? [];
    intervals.push(interval);
    categories.set(request.leave_category, intervals);
  }
  return employees.map((employee) => {
    const categories = days.get(employee.user_id);
    return {
      ...employee,
      total_leave_days: uniqueDays([...categories.values()].flat()),
      category_days: Object.fromEntries([...categories].map(([category, intervals]) => [category, uniqueDays(intervals)])),
    };
  }).sort((a, b) => b.total_leave_days - a.total_leave_days || a.full_name.localeCompare(b.full_name, "id"));
}

export async function loadUnitLeaveDayRecap(supabase, dates) {
  async function readAll(query) {
    const rows = [];
    // Read through the API row limit so both the table and Excel include every result.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await query().range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  }
  const employees = await readAll(() => supabase.rpc("unit_leave_counts_active_year", {
    p_start_date: dates.startDate, p_end_date: dates.endDate,
  }).order("user_id"));
  if (!employees.length) return [];
  const requests = await readAll(() => supabase.from("leave_requests")
    .select("user_id, start_date, end_date, leave_category, academic_years!inner(is_active)")
    .eq("academic_years.is_active", true)
    .lte("start_date", dates.endDate)
    .gte("end_date", dates.startDate)
    .order("id"));
  return unitLeaveDayRecap(employees, requests, dates.startDate, dates.endDate);
}

export function unitLeaveExcelRows(rows, categories) {
  return rows.map((row) => ({
    Nama: row.full_name,
    "No. Pegawai": row.employee_no,
    Unit: row.unit_name ?? "-",
    "Jumlah Hari Izin": row.total_leave_days,
    ...Object.fromEntries(categories.map((category) => [`${category} (hari)`, Object.hasOwn(row.category_days, category) ? row.category_days[category] : 0])),
  }));
}
