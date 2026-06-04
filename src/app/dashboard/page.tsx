import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard - Nurussunnah Hub" };

type MonitoringRow = {
  user_id: string;
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  unit_code: string | null;
  target_count: number;
  completed_count: number;
  is_complete: boolean;
};

type OperationalAttentionItem = {
  key: string;
  title: string;
  detail: string;
  percent: number | null;
};

type OperationalMetric = {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "success";
};

type OperationalSummary = {
  role: "HRD" | "KEPALA_UNIT";
  title: string;
  description: string;
  metrics: OperationalMetric[];
  attentionTitle: string;
  attentionItems: OperationalAttentionItem[];
  ctas: { href: string; label: string }[];
};

function safeCount(value: number | null | undefined) {
  return value ?? 0;
}

function percent(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

function unitKey(row: Pick<MonitoringRow, "unit_code" | "unit_name">) {
  return row.unit_code || row.unit_name || "__none";
}

function unitLabel(row: Pick<MonitoringRow, "unit_code" | "unit_name">) {
  return row.unit_name || row.unit_code || "Tanpa unit";
}

function buildUnitAttention(
  rows: MonitoringRow[],
  limit = 3
): OperationalAttentionItem[] {
  const units = new Map<
    string,
    { title: string; completed: number; total: number; incomplete: number }
  >();

  rows.forEach((row) => {
    const key = unitKey(row);
    const current = units.get(key) ?? {
      title: unitLabel(row),
      completed: 0,
      total: 0,
      incomplete: 0,
    };
    current.completed += row.completed_count;
    current.total += row.target_count;
    if (!row.is_complete) current.incomplete += 1;
    units.set(key, current);
  });

  return Array.from(units, ([key, unit]) => ({
    key,
    title: unit.title,
    detail: `${unit.incomplete} pegawai belum selesai`,
    percent: percent(unit.completed, unit.total),
  }))
    .sort(
      (a, b) =>
        (a.percent ?? 0) - (b.percent ?? 0) ||
        a.title.localeCompare(b.title, "id")
    )
    .slice(0, limit);
}

async function buildOperationalSummary({
  supabase,
  userId,
  roles,
  activeYearId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  roles: string[];
  activeYearId: string | null;
}): Promise<OperationalSummary | null> {
  const isHrd = roles.includes("HRD");
  const isAdmin = roles.includes("ADMIN");
  const isKepalaUnit = roles.includes("KEPALA_UNIT");
  if (!isHrd && !isKepalaUnit) return null;

  const { data: monitoringData } = activeYearId
    ? await supabase.rpc("get_feedback_monitoring_scoped", {
        p_academic_year_id: activeYearId,
      })
    : { data: [] };
  const monitoring = (monitoringData ?? []) as MonitoringRow[];
  const completedTargets = monitoring.reduce(
    (sum, row) => sum + row.completed_count,
    0
  );
  const totalTargets = monitoring.reduce((sum, row) => sum + row.target_count, 0);
  const feedbackPercent = percent(completedTargets, totalTargets);
  const incompleteEmployees = monitoring.filter((row) => !row.is_complete).length;

  if (isHrd) {
    const [
      { count: activeEmployees },
      { count: inactiveEmployees },
      { count: activeUnits },
      { count: missingUnit },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false),
      supabase
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .is("home_unit_id", null),
    ]);

    return {
      role: "HRD",
      title: "Ringkasan Operasional",
      description: "Ikhtisar pegawai dan feedback seluruh lembaga.",
      metrics: [
        {
          key: "active",
          label: "Pegawai aktif",
          value: String(safeCount(activeEmployees)),
          helper: "Seluruh lembaga",
        },
        {
          key: "inactive",
          label: "Pegawai nonaktif",
          value: String(safeCount(inactiveEmployees)),
          helper: "Untuk audit data",
        },
        {
          key: "units",
          label: "Unit aktif",
          value: String(safeCount(activeUnits)),
          helper: "Unit organisasi aktif",
        },
        {
          key: "feedback",
          label: "Progress feedback",
          value: activeYearId ? `${feedbackPercent}%` : "-",
          helper: activeYearId
            ? `${completedTargets}/${totalTargets} target selesai`
            : "Tahun pelajaran belum aktif",
          tone: feedbackPercent === 100 ? "success" : "warning",
        },
        {
          key: "missing-unit",
          label: "Profil tanpa unit",
          value: String(safeCount(missingUnit)),
          helper: "Pegawai aktif perlu dilengkapi",
          tone: safeCount(missingUnit) > 0 ? "warning" : "success",
        },
      ],
      attentionTitle: "Perlu Perhatian",
      attentionItems: activeYearId ? buildUnitAttention(monitoring) : [],
      ctas: [
        { href: "/dashboard/employees", label: "Direktori Pegawai" },
        { href: "/dashboard/feedback", label: "Monitoring Feedback" },
        ...(isAdmin || isHrd
          ? [{ href: "/dashboard/academic-years", label: "Tahun Pelajaran" }]
          : []),
      ],
    };
  }

  const [{ data: assignments }, { data: myProfile }] = await Promise.all([
    supabase
      .from("user_unit_assignments")
      .select("unit_id")
      .eq("user_id", userId)
      .eq("assignment_type", "HOME"),
    supabase.from("profiles").select("home_unit_id").eq("id", userId).maybeSingle(),
  ]);
  const scopedUnitIds = Array.from(
    new Set(
      [
        ...(assignments ?? []).map((item) => item.unit_id),
        myProfile?.home_unit_id,
      ].filter((id): id is string => Boolean(id))
    )
  );

  const { count: activeEmployees } = scopedUnitIds.length
    ? await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in("home_unit_id", scopedUnitIds)
    : { count: 0 };

  const receiverIds = Array.from(new Set(monitoring.map((row) => row.user_id)));
  const { count: writtenFeedback } =
    activeYearId && receiverIds.length
      ? await supabase
          .from("peer_feedbacks")
          .select("id", { count: "exact", head: true })
          .eq("academic_year_id", activeYearId)
          .eq("is_completed", true)
          .in("receiver_user_id", receiverIds)
          .not("feedback_text", "is", null)
          .neq("feedback_text", "")
      : { count: 0 };

  const attentionItems = activeYearId
    ? scopedUnitIds.length > 1
      ? buildUnitAttention(monitoring)
      : [
          {
            key: "incomplete",
            title: "Feedback belum selesai",
            detail: `${incompleteEmployees} pegawai perlu menyelesaikan feedback`,
            percent: feedbackPercent,
          },
        ]
    : [];

  return {
    role: "KEPALA_UNIT",
    title: "Ringkasan Operasional",
    description: "Ikhtisar pegawai dan feedback dalam cakupan unit Anda.",
    metrics: [
      {
        key: "active",
        label: "Pegawai aktif",
        value: String(safeCount(activeEmployees)),
        helper: "Dalam cakupan unit",
      },
      {
        key: "feedback",
        label: "Progress feedback",
        value: activeYearId ? `${feedbackPercent}%` : "-",
        helper: activeYearId
          ? `${completedTargets}/${totalTargets} target selesai`
          : "Tahun pelajaran belum aktif",
        tone: feedbackPercent === 100 ? "success" : "warning",
      },
      {
        key: "incomplete",
        label: "Belum selesai",
        value: String(incompleteEmployees),
        helper: "Pegawai perlu pengingat",
        tone: incompleteEmployees > 0 ? "warning" : "success",
      },
      {
        key: "written",
        label: "Feedback tertulis",
        value: String(safeCount(writtenFeedback)),
        helper: "Catatan masuk, tanpa identitas pemberi",
      },
    ],
    attentionTitle: "Perlu Perhatian",
    attentionItems,
    ctas: [
      { href: "/dashboard/employees", label: "Direktori Pegawai" },
      { href: "/dashboard/feedback", label: "Monitoring Feedback" },
    ],
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, employee_status, is_active, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)")
    .eq("id", user.id)
    .single();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date")
    .eq("is_active", true)
    .single();

  const roles: string[] = (userRoles ?? []).map((role) => role.role);

  const { count: feedbackDone } = activeYear
    ? await supabase
        .from("peer_feedbacks")
        .select("id", { count: "exact", head: true })
        .eq("giver_user_id", user.id)
        .eq("academic_year_id", activeYear.id)
        .eq("is_completed", true)
    : { count: 0 };


  const operationalSummary = await buildOperationalSummary({
    supabase,
    userId: user.id,
    roles,
    activeYearId: activeYear?.id ?? null,
  });

  return (
    <DashboardContent
      profile={profile}
      roles={roles}
      activeYear={activeYear}
      feedbackDoneCount={feedbackDone ?? 0}
      operationalSummary={operationalSummary}
    />
  );
}

