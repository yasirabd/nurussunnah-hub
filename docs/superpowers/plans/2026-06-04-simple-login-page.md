# Simple Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current split auth screen with a centered compact login page while keeping existing Supabase login behavior unchanged.

**Architecture:** `src/app/auth/layout.tsx` owns only the auth page shell and centered container. `src/app/auth/login/page.tsx` owns the brand row, form UI, password toggle, validation, toast handling, and redirect. Verification uses static checks plus `npm run build` because this project has no dedicated test script.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn-style UI, lucide-react, Supabase auth.

---

## File Structure

- Modify: `src/app/auth/layout.tsx` - remove split hero layout and make auth pages centered.
- Modify: `src/app/auth/login/page.tsx` - simplify copy/layout, keep auth behavior, add accessible password-toggle label.
- Create: no new production files.
- Test: static PowerShell checks and `npm run build`.

### Task 1: Simplify Auth Layout

**Files:**
- Modify: `src/app/auth/layout.tsx`

- [ ] **Step 1: Write failing static check**

Run before editing:

```powershell
rg -n "<main.*items-center.*justify-center" src\app\auth\layout.tsx
```

Expected before implementation: no matches, exit code `1`, because the layout is still a split `div` shell instead of the centered `main` shell.

- [ ] **Step 2: Confirm old split layout exists**

Run before editing:

```powershell
rg -n "lg:grid-cols|Left panel|Feature chips|Building2|CalendarDays|MessageSquareMore|Users" src\app\auth\layout.tsx
```

Expected before implementation: matches exist, showing the old split/hero layout is present.

- [ ] **Step 3: Replace layout implementation**

Replace `src/app/auth/layout.tsx` with:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 sm:px-8">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}
```

- [ ] **Step 4: Verify static checks pass**

Run:

```powershell
rg -n "<main.*items-center.*justify-center" src\app\auth\layout.tsx
```

Expected: one match.

Run:

```powershell
rg -n "lg:grid-cols|Left panel|Feature chips|Building2|CalendarDays|MessageSquareMore|Users" src\app\auth\layout.tsx
```

Expected: no matches, exit code `1`.

### Task 2: Compact Login Form UI

**Files:**
- Modify: `src/app/auth/login/page.tsx`

- [ ] **Step 1: Write failing static check**

Run before editing:

```powershell
rg -n "Sembunyikan password|Tampilkan password" src\app\auth\login\page.tsx
```

Expected before implementation: no matches, exit code `1`, because the current password toggle lacks an accessible name.

- [ ] **Step 2: Confirm old heading exists**

Run before editing:

```powershell
rg -n "Masuk ke Sistem" src\app\auth\login\page.tsx
```

Expected before implementation: one match.

- [ ] **Step 3: Update compact UI only**

Keep imports, schema, form setup, and `onSubmit` behavior. Update the returned JSX to:

```tsx
return (
  <div className="space-y-8">
    <div className="flex items-center justify-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-primary shadow-sm">
        <span className="text-base font-bold text-primary-foreground">N</span>
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-foreground">Nurussunnah Hub</p>
        <p className="text-xs text-muted-foreground">Portal SDM Internal</p>
      </div>
    </div>

    <div className="space-y-2 text-center">
      <h1 className="text-[28px] font-semibold tracking-normal text-foreground">
        Masuk
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Gunakan email atau NIY beserta password Anda.
      </p>
    </div>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Email atau NIY</FormLabel>
              <FormControl>
                <Input
                  id="login-identifier"
                  placeholder="nama@email.com atau SD002"
                  autoComplete="username"
                  disabled={isLoading}
                  className="h-12 rounded-[var(--radius-sm)] px-4 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-4">
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <Link
                  href="/auth/forgot-password"
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-12 rounded-[var(--radius-sm)] px-4 pr-12 text-sm"
                    {...field}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          id="login-submit"
          type="submit"
          className="h-12 w-full rounded-[var(--radius-full)] text-sm font-semibold"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Memproses..." : "Masuk"}
        </Button>
      </form>
    </Form>

    <p className="text-center text-xs leading-relaxed text-muted-foreground">
      Belum punya akun? Hubungi{" "}
      <span className="font-semibold text-foreground">Admin / HRD</span> untuk pendaftaran.
    </p>
  </div>
);
```

- [ ] **Step 4: Verify compact UI static checks pass**

Run:

```powershell
rg -n "Sembunyikan password|Tampilkan password|Portal SDM Internal|<h1|Masuk ke Sistem" src\app\auth\login\page.tsx
```

Expected: matches for password-toggle label text, `Portal SDM Internal`, and `<h1`; no match for `Masuk ke Sistem`.

### Task 3: Build Verification and Commit

**Files:**
- Modify: `docs/superpowers/plans/2026-06-04-simple-login-page.md`
- Modify: `src/app/auth/layout.tsx`
- Modify: `src/app/auth/login/page.tsx`

- [ ] **Step 1: Run production build**

Run:

```powershell
npm run build
```

Expected: successful Next.js build.

- [ ] **Step 2: Review scoped diff**

Run:

```powershell
git diff -- src\app\auth\layout.tsx src\app\auth\login\page.tsx docs\superpowers\plans\2026-06-04-simple-login-page.md
```

Expected: only the centered auth shell, compact login UI, and this plan file changed.

- [ ] **Step 3: Commit implementation**

Run:

```powershell
git add docs\superpowers\plans\2026-06-04-simple-login-page.md src\app\auth\layout.tsx src\app\auth\login\page.tsx
git commit -m "feat: simplify login page"
```

Expected: commit succeeds. Existing unrelated changes in `next.config.ts` and `package.json` remain unstaged.

## Self-Review

- Spec coverage: layout simplification, compact brand/form, preserved auth behavior, accessibility label, and build verification are covered.
- Placeholder scan: no placeholder work remains.
- Type consistency: no new public types or APIs are introduced.
