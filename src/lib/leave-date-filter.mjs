export function leaveDateFilter(searchParams, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const month = today.slice(0, 7);
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const startDate = searchParams.leaveStartDate ?? `${month}-01`;
  const endDate = searchParams.leaveEndDate ?? `${month}-${lastDay}`;
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number(value.slice(0, 4)) > 0
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
  const error = !validDate(startDate) || !validDate(endDate)
    ? "Isi tanggal mulai dan tanggal selesai yang valid."
    : startDate > endDate ? "Tanggal selesai harus sama atau setelah tanggal mulai." : null;
  return { startDate, endDate, error };
}
