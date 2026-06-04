# Admin Dashboard Operational Aggregates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-aware operational aggregate cards and attention signals to `/dashboard` for HRD and Kepala Unit.

**Architecture:** Keep all Supabase access and role/scope decisions in `src/app/dashboard/page.tsx`. Pass a precomputed `operationalSummary` object to the existing client component. Render compact cards and a short attention list in `src/components/dashboard/dashboard-content.tsx`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase SSR client, shadcn-style local UI components, lucide-react.

---

## File Structure

- Modify: `src/app/dashboard/page.tsx`
  - Add local dashboard aggregate types.
  - Add helper functions for monitoring aggregation and scoped unit resolution.
  - Fetch role-aware counts server-side.
  - Pass `operationalSummary` to `DashboardContent`.
- Modify: `src/components/dashboard/dashboard-content.tsx`
  - Extend props with `operationalSummary`.
  - Add `OperationalSummarySection`, `OperationalMetricCard`, `AttentionList`, and compact progress helpers.
  - Render the new section only when the prop exists.
- Verify: `npx tsc --noEmit`
- Verify: `npm run build`

## Task 1: Server Aggregate Data

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add aggregate types near imports**

```ts
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
```

- [ ] **Step 2: Add pure helpers below metadata**

```ts
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

function buildUnitAttention(rows: MonitoringRow[], limit = 3): OperationalAttentionItem[] {
  const units = new Map<string, { title: string; completed: number; total: number; incomplete: number }>();

  rows.forEach((row) => {
    const key = unitKey(row);
    const current = units.get(key) ?? { title: unitLabel(row), completed: 0, total: 0, incomplete: 0 };
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
    .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0) || a.title.localeCompare(b.title, "id"))
    .slice(0, limit);
}
```

- [ ] **Step 3: Add `buildOperationalSummary` below helpers**

```ts
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
    ? await supabase.rpc("get_feedback_monitoring_scoped", { p_academic_year_id: activeYearId })
    : { data: [] };
  const monitoring = (monitoringData ?? []) as MonitoringRow[];
  const completedTargets = monitoring.reduce((sum, row) => sum + row.completed_count, 0);
  const totalTargets = monitoring.reduce((sum, row) => sum + row.target_count, 0);
  const feedbackPercent = percent(completedTargets, totalTargets);
  const incompleteEmployees = monitoring.filter((row) => !row.is_complete).length;

  if (isHrd) {
    const [{ count: activeEmployees }, { count: inactiveEmployees }, { count: activeUnits }, { count: missingUnit }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("units").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true).is("home_unit_id", null),
    ]);

    return {
      role: "HRD",
      title: "Ringkasan Operasional",
      description: "Ikhtisar pegawai dan feedback seluruh lembaga.",
      metrics: [
        { key: "active", label: "Pegawai aktif", value: String(safeCount(activeEmployees)), helper: "Seluruh lembaga" },
        { key: "inactive", label: "Pegawai nonaktif", value: String(safeCount(inactiveEmployees)), helper: "Untuk audit data" },
        { key: "units", label: "Unit aktif", value: String(safeCount(activeUnits)), helper: "Unit organisasi aktif" },
        { key: "feedback", label: "Progress feedback", value: activeYearId ? `${feedbackPercent}%` : "-", helper: activeYearId ? `${completedTargets}/${totalTargets} target selesai` : "Tahun pelajaran belum aktif", tone: feedbackPercent === 100 ? "success" : "warning" },
        { key: "missing-unit", label: "Profil tanpa unit", value: String(safeCount(missingUnit)), helper: "Pegawai aktif perlu dilengkapi", tone: safeCount(missingUnit) > 0 ? "warning" : "success" },
      ],
      attentionTitle: "Perlu Perhatian",
      attentionItems: activeYearId ? buildUnitAttention(monitoring) : [],
      ctas: [
        { href: "/dashboard/employees", label: "Direktori Pegawai" },
        { href: "/dashboard/feedback", label: "Monitoring Feedback" },
        ...(isAdmin || isHrd ? [{ href: "/dashboard/academic-years", label: "Tahun Pelajaran" }] : []),
      ],
    };
  }

  const [{ data: assignments }, { data: myProfile }] = await Promise.all([
    supabase.from("user_unit_assignments").select("unit_id").eq("user_id", userId).eq("assignment_type", "HOME"),
    supabase.from("profiles").select("home_unit_id").eq("id", userId).maybeSingle(),
  ]);
  const scopedUnitIds = Array.from(new Set([...(assignments ?? []).map((item) => item.unit_id), myProfile?.home_unit_id].filter((id): id is string => Boolean(id))));

  const { count: activeEmployees } = scopedUnitIds.length
    ? await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true).in("home_unit_id", scopedUnitIds)
    : { count: 0 };

  const receiverIds = Array.from(new Set(monitoring.map((row) => row.user_id)));
  const { count: writtenFeedback } = activeYearId && receiverIds.length
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
      : [{ key: "incomplete", title: "Feedback belum selesai", detail: `${incompleteEmployees} pegawai perlu menyelesaikan feedback`, percent: feedbackPercent }]
    : [];

  return {
    role: "KEPALA_UNIT",
    title: "Ringkasan Operasional",
    description: "Ikhtisar pegawai dan feedback dalam cakupan unit Anda.",
    metrics: [
      { key: "active", label: "Pegawai aktif", value: String(safeCount(activeEmployees)), helper: "Dalam cakupan unit" },
      { key: "feedback", label: "Progress feedback", value: activeYearId ? `${feedbackPercent}%` : "-", helper: activeYearId ? `${completedTargets}/${totalTargets} target selesai` : "Tahun pelajaran belum aktif", tone: feedbackPercent === 100 ? "success" : "warning" },
      { key: "incomplete", label: "Belum selesai", value: String(incompleteEmployees), helper: "Pegawai perlu pengingat", tone: incompleteEmployees > 0 ? "warning" : "success" },
      { key: "written", label: "Feedback tertulis", value: String(safeCount(writtenFeedback)), helper: "Catatan masuk, tanpa identitas pemberi" },
    ],
    attentionTitle: "Perlu Perhatian",
    attentionItems,
    ctas: [
      { href: "/dashboard/employees", label: "Direktori Pegawai" },
      { href: "/dashboard/feedback", label: "Monitoring Feedback" },
    ],
  };
}
```

- [ ] **Step 4: Call helper in `DashboardPage` before return**

```ts
  const operationalSummary = await buildOperationalSummary({
    supabase,
    userId: user.id,
    roles,
    activeYearId: activeYear?.id ?? null,
  });
```

- [ ] **Step 5: Pass prop to client component**

```tsx
    <DashboardContent
      profile={profile}
      roles={roles}
      activeYear={activeYear}
      feedbackDoneCount={feedbackDone ?? 0}
      operationalSummary={operationalSummary}
    />
```

## Task 2: Dashboard Presentation

**Files:**
- Modify: `src/components/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Add icons to existing import**

```ts
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  MessageSquareText,
  MessageSquareMore,
  UserRound,
  Users,
} from "lucide-react";
```

- [ ] **Step 2: Add operational types before `DashboardContentProps`**

```ts
type OperationalMetric = {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "success";
};

type OperationalAttentionItem = {
  key: string;
  title: string;
  detail: string;
  percent: number | null;
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
```

- [ ] **Step 3: Extend props and render section after hero**

```ts
  operationalSummary?: OperationalSummary | null;
```

```tsx
      {operationalSummary && (
        <OperationalSummarySection summary={operationalSummary} />
      )}
```

- [ ] **Step 4: Add presentation helpers near existing component helpers**

```tsx
function OperationalSummarySection({ summary }: { summary: OperationalSummary }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">{summary.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.ctas.map((cta) => (
            <Link key={cta.href} href={cta.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-[var(--radius-full)]")}>{cta.label}</Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.metrics.map((metric) => (
          <OperationalMetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <AttentionList title={summary.attentionTitle} items={summary.attentionItems} />
    </section>
  );
}

function OperationalMetricCard({ metric }: { metric: OperationalMetric }) {
  const toneClass = metric.tone === "warning" ? "bg-warning/12 text-warning" : metric.tone === "success" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground";
  const Icon = metric.key.includes("feedback") || metric.key === "written" ? MessageSquareText : metric.key.includes("unit") ? Building2 : Users;

  return (
    <Card className="rounded-[var(--radius-lg)] border-border/70 elevation-1">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]", toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-muted-foreground">{metric.label}</span>
          <span className="mt-1 block text-2xl font-semibold tracking-normal">{metric.value}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{metric.helper}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function AttentionList({ title, items }: { title: string; items: OperationalAttentionItem[] }) {
  return (
    <Card className="rounded-[var(--radius-lg)] border-border/70 elevation-1">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-warning" />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {items.length === 0 ? (
          <p className="rounded-[var(--radius-md)] bg-secondary/60 px-4 py-3 text-sm text-muted-foreground md:col-span-3">Belum ada data monitoring feedback.</p>
        ) : (
          items.map((item) => (
            <div key={item.key} className="rounded-[var(--radius-md)] border bg-secondary/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
                {item.percent !== null && <Badge variant="secondary" className="border-0 bg-warning/12 text-warning">{item.percent}%</Badge>}
              </div>
              {item.percent !== null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

## Task 3: Verification and Commit


**Files:**
- Verify: `src/app/dashboard/page.tsx`
- Verify: `src/components/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Run TypeScript**

Run: `npx tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Review git diff**

Run: `git diff --stat`
Expected: only dashboard files and this plan changed, plus pre-existing unrelated dirty files still visible if they were dirty before.

- [ ] **Step 4: Commit implementation files and plan only**

```bash
git add docs/superpowers/plans/2026-06-04-admin-dashboard-operational-aggregates.md src/app/dashboard/page.tsx src/components/dashboard/dashboard-content.tsx
git commit -m "feat: add admin dashboard aggregates"
```

---

## Self-Review

- Spec coverage: HRD metrics, Kepala Unit metrics, scoped data, feedback monitoring reuse, count-only written feedback, hidden Pegawai section, empty states, security boundaries, and verification are covered.
- Placeholder scan: no TBD/TODO/placeholders remain.
- Type consistency: `OperationalSummary`, `OperationalMetric`, and `OperationalAttentionItem` names match across server and client tasks.

