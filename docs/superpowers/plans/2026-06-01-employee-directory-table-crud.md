# Employee Directory Table CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split directory table and separate edit forms with a unified table + side drawer CRUD interface for employee management.

**Architecture:** Keep server-side data loading in `page.tsx`. Extract the interactive table and drawer into a new client component that receives pre-loaded data and permission flags. The drawer uses tabs for profile, role, and position editing, each submitting to existing server actions.

**Tech Stack:** Next.js 15 App Router, React Server Components, shadcn/ui (Table, Drawer, Tabs, Button, Input, Badge), Lucide icons, existing server actions.

---

## File Structure

**Create:**
- `src/app/dashboard/employees/employee-directory-table.tsx` - Client component for interactive table + drawer

**Modify:**
- `src/app/dashboard/employees/page.tsx` - Refactor to use new client component, remove duplicate edit forms

**Existing (no changes):**
- `src/app/dashboard/employees/actions.ts` - Server actions already support all CRUD operations
- `src/components/ui/drawer.tsx` - Drawer component already exists (vaul)
- `src/components/ui/tabs.tsx` - Tabs component already exists
- `src/components/ui/table.tsx` - Table component already exists

---

## Implementation Tasks

### Task 1: Create Client Component Shell

**Files:**
- Create: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Create empty client component file**

```typescript
"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

type EmployeeRow = {
  id: string;
  full_name: string;
  employee_no: string;
  email: string;
  phone: string | null;
  employee_status: string;
  is_active: boolean;
  home_unit_id: string | null;
  units: { id: string; name: string; code: string } | null;
};

type UnitOption = {
  id: string;
  name: string;
  code: string;
};

type EmployeeDirectoryTableProps = {
  rows: EmployeeRow[];
  rolesByUser: Map<string, string[]>;
  positionsByUser: Map<string, string[]>;
  units: UnitOption[];
  canManageEmployees: boolean;
};

export function EmployeeDirectoryTable({
  rows,
  rolesByUser,
  positionsByUser,
  units,
  canManageEmployees,
}: EmployeeDirectoryTableProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pegawai</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Jabatan</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tidak ada data pegawai.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row.employee_no}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {row.units ? (
                    <div>
                      <p className="text-sm">{row.units.name}</p>
                      <p className="text-xs text-muted-foreground">{row.units.code}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <PillList values={positionsByUser.get(row.id) ?? []} fallback="-" />
                </TableCell>
                <TableCell>
                  <PillList values={rolesByUser.get(row.id) ?? []} fallback="PEGAWAI" />
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-sm">
                    <p>{row.email}</p>
                    <p className="text-muted-foreground">{row.phone || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={row.is_active ? "default" : "secondary"} className="w-fit">
                      {row.is_active ? "Aktif" : "Non-aktif"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {statusLabel(row.employee_status)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {canManageEmployees && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(row);
                        setDrawerOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedEmployee?.full_name}
            </DrawerTitle>
            <DrawerDescription>
              NIY: {selectedEmployee?.employee_no} • Unit: {selectedEmployee?.units?.name || "-"} • Status: {selectedEmployee?.is_active ? "Aktif" : "Non-aktif"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <Tabs defaultValue="profil">
              <TabsList>
                <TabsTrigger value="profil">Profil</TabsTrigger>
                <TabsTrigger value="role">Role</TabsTrigger>
                <TabsTrigger value="jabatan">Jabatan</TabsTrigger>
              </TabsList>
              <TabsContent value="profil">
                {/* Profil form will be added in next task */}
                <p className="text-sm text-muted-foreground">Profil form placeholder</p>
              </TabsContent>
              <TabsContent value="role">
                {/* Role form will be added in next task */}
                <p className="text-sm text-muted-foreground">Role form placeholder</p>
              </TabsContent>
              <TabsContent value="jabatan">
                {/* Jabatan form will be added in next task */}
                <p className="text-sm text-muted-foreground">Jabatan form placeholder</p>
              </TabsContent>
            </Tabs>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Tutup</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function PillList({ values, fallback }: { values: string[]; fallback: string }) {
  if (!values.length) return <span className="text-sm text-muted-foreground">{fallback}</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary" className="font-normal">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    TETAP: "Tetap",
    TIDAK_TETAP: "Tidak Tetap",
    KONTRAK: "Kontrak",
    HONORER: "Honorer",
    PENSIUN: "Pensiun",
  };
  return labels[status] ?? status;
}

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit --incremental false`
Expected: No errors

- [ ] **Step 3: Commit shell**

```bash
git add src/app/dashboard/employees/employee-directory-table.tsx
git commit -m "feat: add employee directory table shell"
```

---

### Task 2: Add Profil Tab Form

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Replace Profil tab placeholder with form**

Replace the Profil `TabsContent` section with:

```typescript
<TabsContent value="profil" className="space-y-4 py-4">
  {selectedEmployee && (
    <form action={updateEmployeeProfileAction} className="space-y-4">
      <input type="hidden" name="id" value={selectedEmployee.id} />
      
      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium">
          Nama Lengkap
        </label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={selectedEmployee.full_name}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="employee_no" className="text-sm font-medium">
          NIY
        </label>
        <Input
          id="employee_no"
          name="employee_no"
          defaultValue={selectedEmployee.employee_no}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={selectedEmployee.email}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          No. HP
        </label>
        <Input
          id="phone"
          name="phone"
          defaultValue={selectedEmployee.phone ?? ""}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="employee_status" className="text-sm font-medium">
          Status Pegawai
        </label>
        <select
          id="employee_status"
          name="employee_status"
          defaultValue={selectedEmployee.employee_status}
          className="flex h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="TETAP">Tetap</option>
          <option value="TIDAK_TETAP">Tidak Tetap</option>
          <option value="KONTRAK">Kontrak</option>
          <option value="HONORER">Honorer</option>
          <option value="PENSIUN">Pensiun</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="home_unit_id" className="text-sm font-medium">
          Unit Home
        </label>
        <select
          id="home_unit_id"
          name="home_unit_id"
          defaultValue={selectedEmployee.home_unit_id ?? ""}
          className="flex h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tanpa unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.code} - {unit.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          defaultChecked={selectedEmployee.is_active}
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Pegawai Aktif
        </label>
      </div>

      <Button type="submit" className="w-full">
        Simpan Profil
      </Button>
    </form>
  )}
</TabsContent>
```

- [ ] **Step 2: Add import for server action**

Add to imports at top of file:

```typescript
import {
  updateEmployeeProfileAction,
  updateEmployeeRolesAction,
  updateEmployeeCurrentPositionAction,
} from "./actions";
```

- [ ] **Step 3: Verify component compiles**

Run: `npx tsc --noEmit --incremental false`
Expected: No errors

- [ ] **Step 4: Commit Profil tab**

```bash
git add src/app/dashboard/employees/employee-directory-table.tsx
git commit -m "feat: add profil tab form to employee drawer"
```

---

### Task 3: Add Role Tab Form

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Replace Role tab placeholder with form**

Replace the Role `TabsContent` section with:

```typescript
<TabsContent value="role" className="space-y-4 py-4">
  {selectedEmployee && (
    <form action={updateEmployeeRolesAction} className="space-y-4">
      <input type="hidden" name="user_id" value={selectedEmployee.id} />
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pilih role yang sesuai untuk pegawai ini:
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="role_pegawai"
              name="PEGAWAI"
              defaultChecked={rolesByUser.get(selectedEmployee.id)?.includes("PEGAWAI")}
            />
            <label htmlFor="role_pegawai" className="text-sm font-medium">
              PEGAWAI
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="role_kepala_unit"
              name="KEPALA_UNIT"
              defaultChecked={rolesByUser.get(selectedEmployee.id)?.includes("KEPALA_UNIT")}
            />
            <label htmlFor="role_kepala_unit" className="text-sm font-medium">
              KEPALA_UNIT
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="role_hrd"
              name="HRD"
              defaultChecked={rolesByUser.get(selectedEmployee.id)?.includes("HRD")}
            />
            <label htmlFor="role_hrd" className="text-sm font-medium">
              HRD
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="role_admin"
              name="ADMIN"
              defaultChecked={rolesByUser.get(selectedEmployee.id)?.includes("ADMIN")}
            />
            <label htmlFor="role_admin" className="text-sm font-medium">
              ADMIN
            </label>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Simpan Role
      </Button>
    </form>
  )}
</TabsContent>
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit --incremental false`
Expected: No errors

- [ ] **Step 3: Commit Role tab**

```bash
git add src/app/dashboard/employees/employee-directory-table.tsx
git commit -m "feat: add role tab form to employee drawer"
```

---

### Task 4: Add Jabatan Tab Form

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Replace Jabatan tab placeholder with form**

Replace the Jabatan `TabsContent` section with:

```typescript
<TabsContent value="jabatan" className="space-y-4 py-4">
  {selectedEmployee && (
    <form action={updateEmployeeCurrentPositionAction} className="space-y-4">
      <input type="hidden" name="user_id" value={selectedEmployee.id} />
      
      <div className="space-y-2">
        <label htmlFor="position_name" className="text-sm font-medium">
          Jabatan Aktif
        </label>
        <Input
          id="position_name"
          name="position_name"
          defaultValue={positionsByUser.get(selectedEmployee.id)?.[0] ?? ""}
          placeholder="Contoh: Kepala Unit, Guru Matematika"
          required
        />
        <p className="text-xs text-muted-foreground">
          Jabatan yang sedang aktif untuk pegawai ini.
        </p>
      </div>

      <Button type="submit" className="w-full">
        Simpan Jabatan
      </Button>
    </form>
  )}
</TabsContent>
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit --incremental false`
Expected: No errors

- [ ] **Step 3: Commit Jabatan tab**

```bash
git add src/app/dashboard/employees/employee-directory-table.tsx
git commit -m "feat: add jabatan tab form to employee drawer"
```

---

### Task 5: Refactor Server Page to Use New Component

**Files:**
- Modify: `src/app/dashboard/employees/page.tsx`

- [ ] **Step 1: Import new client component**

Add to imports at top of file:

```typescript
import { EmployeeDirectoryTable } from "./employee-directory-table";
```

- [ ] **Step 2: Remove old table and Kelola Pegawai section**

Replace the entire section from `<Card>` (containing the table) through the end of the `canManageEmployees && <Card>` (Kelola Pegawai section) with:

```typescript
<Card>
  <CardHeader>
    <CardTitle>Daftar Pegawai</CardTitle>
    <CardDescription>
      {rows.length} pegawai ditemukan
      {(q || unitId || active !== "active") && (
        <Button
          variant="link"
          size="sm"
          className="ml-2"
          onClick={() => {
            window.location.href = "/dashboard/employees";
          }}
        >
          Reset filter
        </Button>
      )}
    </CardDescription>
  </CardHeader>
  <CardContent>
    {error ? (
      <p className="text-sm text-destructive">Error: {error.message}</p>
    ) : (
      <EmployeeDirectoryTable
        rows={rows}
        rolesByUser={rolesByUser}
        positionsByUser={positionsByUser}
        units={units}
        canManageEmployees={canManageEmployees}
      />
    )}
  </CardContent>
</Card>
```

- [ ] **Step 3: Remove helper components that are now in client component**

Remove the `PillList` and `MetricCard` function definitions from the bottom of the file (they're now in the client component).

- [ ] **Step 4: Verify page compiles**

Run: `npx tsc --noEmit --incremental false`
Expected: No errors

- [ ] **Step 5: Commit refactored page**

```bash
git add src/app/dashboard/employees/page.tsx
git commit -m "refactor: use employee directory table component"
```

---

### Task 6: Test and Verify

**Files:**
- Test: `src/app/dashboard/employees/page.tsx`
- Test: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No new errors (existing 8 warnings are acceptable)

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --incremental false`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test - HRD/Admin**

1. Start dev server: `npm run dev`
2. Login as HRD/Admin user
3. Navigate to `/dashboard/employees`
4. Verify table displays with all columns
5. Click edit button on a row
6. Verify drawer opens with three tabs
7. Test Profil tab: edit name, save, verify redirect/success
8. Test Role tab: change roles, save, verify redirect/success
9. Test Jabatan tab: edit position, save, verify redirect/success
10. Verify no "Kelola Pegawai" section appears below table

Expected: All CRUD operations work, drawer closes after save, success messages appear

- [ ] **Step 5: Manual smoke test - Kepala Unit**

1. Login as Kepala Unit user
2. Navigate to `/dashboard/employees`
3. Verify only scoped employees visible
4. Verify edit button appears
5. Click edit, verify drawer opens
6. Verify only Jabatan tab is functional (Profil/Role should be HRD/Admin only)

Expected: Kepala Unit sees limited scope and limited edit capability

- [ ] **Step 6: Manual smoke test - Pegawai**

1. Login as Pegawai user
2. Attempt to navigate to `/dashboard/employees`

Expected: Redirect to `/dashboard`

- [ ] **Step 7: Commit verification notes**

```bash
git add -A
git commit -m "test: verify employee directory table crud"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Replace split table + Kelola Pegawai with unified table + drawer
- ✅ Table columns: Pegawai, Unit, Jabatan, Role, Kontak, Status, Aksi
- ✅ Drawer with three tabs: Profil, Role, Jabatan
- ✅ Each tab submits to existing server actions
- ✅ HRD/Admin full access, Kepala Unit position-only access
- ✅ Server-side authorization preserved
- ✅ Existing success/error handling maintained

**Placeholder scan:**
- No TBD, TODO, or incomplete sections
- All code blocks contain actual implementation
- All imports specified
- All file paths exact

**Type consistency:**
- `EmployeeRow` type matches server page query
- `rolesByUser` and `positionsByUser` are `Map<string, string[]>` in both files
- Server action imports match existing action signatures
- Props passed from server page match client component expectations

**Scope check:**
- Single focused feature: employee directory CRUD redesign
- No database changes
- No new server actions
- No changes outside `/dashboard/employees`
- Implementable in one session

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-01-employee-directory-table-crud.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
