import * as XLSX from "xlsx";

const KIND_LABEL = {
  LUPA_TAP: "Lupa Tap Kartu",
  KARTU_TERTINGGAL: "Kartu Tertinggal",
  KARTU_HILANG_RUSAK: "Kartu Hilang/Rusak",
  KENDALA_SISTEM: "Kendala Sistem",
};

export async function loadRequestRecapDetails(supabase, table, employees, startDate, endDate) {
  if (!["leave_requests", "attendance_corrections"].includes(table)) throw new Error("Invalid recap table");
  if (!employees.length) return [];
  const isLeave = table === "leave_requests";
  const roster = new Map(employees.map((employee) => [employee.user_id, employee]));
  const details = [];
  // Keep the session's RLS; paginate so exports are not truncated by the API limit.
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from(table)
      .select(`id, user_id, reason, status, ${isLeave ? "start_date, end_date, leave_category" : "event_date, correction_kind"}, academic_years!inner(is_active)`)
      .eq("academic_years.is_active", true);
    if (startDate) query = query.gte(isLeave ? "end_date" : "event_date", startDate);
    if (endDate) query = query.lte(isLeave ? "start_date" : "event_date", endDate);
    const { data, error } = await query.order("user_id").order(isLeave ? "start_date" : "event_date").order("id").range(offset, offset + 499);
    if (error) throw error;
    for (const request of data) {
      const employee = roster.get(request.user_id);
      if (!employee) continue;
      details.push({
        Nama: employee.full_name,
        "No. Pegawai": employee.employee_no,
        Unit: employee.unit_name ?? "-",
        ...(isLeave ? {
          "Tanggal Mulai": request.start_date,
          "Tanggal Selesai": request.end_date,
          "Jenis Izin": request.leave_category,
        } : {
          Tanggal: request.event_date,
          "Jenis Koreksi": KIND_LABEL[request.correction_kind] ?? request.correction_kind,
        }),
        Alasan: request.reason ?? "",
        Status: request.status,
      });
    }
    if (data.length < 500) return details;
  }
}

export function requestDetailSheet(rows, isLeave) {
  const header = ["Nama", "No. Pegawai", "Unit", ...(isLeave
    ? ["Tanggal Mulai", "Tanggal Selesai", "Jenis Izin"]
    : ["Tanggal", "Jenis Koreksi"]), "Alasan", "Status"];
  const sheet = XLSX.utils.json_to_sheet(rows, { header });
  sheet["!cols"] = header.map((name) => ({ wch: name === "Alasan" ? 60 : name === "Nama" || name.startsWith("Jenis") ? 30 : 18 }));
  sheet["!autofilter"] = { ref: sheet["!ref"] };
  return sheet;
}
