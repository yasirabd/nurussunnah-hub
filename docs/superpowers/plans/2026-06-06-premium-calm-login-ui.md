# Premium Calm Login UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the Nurussunnah Hub login page to a premium calm visual style with zero behavior change.

**Architecture:** `auth/layout.tsx` adds a subtle ambient gradient background. `auth/login/page.tsx` wraps the form in a refined single card panel with thin border + soft shadow, restrains spacing, and sharpens typography. No new components, no new deps.

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui tokens, shadcn `card` component.

**Files:**
- Modify: `src/app/auth/layout.tsx`
- Modify: `src/app/auth/login/page.tsx`

---

### Task 1: Update Auth Layout with ambient gradient

**Files:**
- Modify: `src/app/auth/layout.tsx`

- [ ] **Replace layout content**

The layout gets a subtle soft gradient background using existing tokens + keeps the centered container. Replace full file:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted to-background px-6 py-10 sm:px-8">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}
```

- [ ] **Save and verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Commit**

```bash
git add src/app/auth/layout.tsx
git commit -m "feat: add ambient gradient bg to auth layout"
```

---

### Task 2: Refine login panel to premium calm card

**Files:**
- Modify: `src/app/auth/login/page.tsx`

- [ ] **Add Card wrapper and tighten spacing**

Wrap the entire form content in a `Card` (from shadcn) with `elevation-1` shadow, thin `border`, and `rounded-[var(--radius-md)]`. Adjust inner spacing: card padding `p-8`, reduce vertical spacing between sections.

Replace the entire file content (JSX section only). Keep all imports, hooks, form logic, schema, and auth handler identical. Only the JSX return block changes.

The file after changes:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email atau NIY wajib diisi")
    .refine(
      (val) => val.includes("@") || /^[A-Za-z0-9]+$/.test(val.replace(/\s/g, "")),
      "Masukkan email yang valid atau NIY"
    ),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    try {
      let email = values.identifier.trim();

      if (!/[@]/.test(email)) {
        const niy = email.replace(/\s/g, "").toUpperCase();
        const { data: resolvedEmail, error: profileError } = await supabase
          .rpc("resolve_login_email", { p_identifier: niy });

        if (profileError || !resolvedEmail) {
          toast.error("NIY tidak ditemukan. Coba gunakan email.");
          return;
        }
        email = resolvedEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email/NIY atau password salah.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Login berhasil! Mengalihkan...");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="elevation-1 border bg-card">
      <CardHeader className="pb-6 pt-8 text-center">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-primary shadow-sm">
            <span className="text-base font-bold text-primary-foreground">N</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-base font-semibold text-foreground">Nurussunnah Hub</p>
            <p className="text-xs text-muted-foreground">Portal SDM Internal</p>
          </div>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Masuk ke Nurussunnah Hub
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Gunakan email atau NIY untuk login.
        </p>
      </CardHeader>
      <CardContent className="px-8 pb-8">
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
              className="h-12 w-full rounded-[var(--radius-md)] text-sm font-semibold"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Belum punya akun? Hubungi{" "}
          <span className="font-semibold text-foreground">Admin / HRD</span> untuk pendaftaran.
        </p>
      </CardContent>
    </Card>
  );
}
```

Key visual changes:
- Outer `div` replaced by `Card` with `elevation-1` + `border` + `bg-card`
- Brand mark + heading moved into `CardHeader` with `pt-8 pb-6`
- Title shortened to `Masuk ke Nurussunnah Hub` (22px/tracking-tight)
- Helper text simplified
- Form + footer in `CardContent px-8 pb-8`
- Submit button radius changed to `rounded-[var(--radius-md)]` (less pill-like, more calm)
- Outer `space-y-8` removed, controlled by Card padding

- [ ] **Save and verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Commit**

```bash
git add src/app/auth/login/page.tsx
git commit -m "feat: premium calm login panel with card wrapper"
```

---

### Task 3: Visual QA on dev server

- [ ] **Start dev server and inspect**

Run: `npm run dev`
Open browser at the local dev URL.

Check at desktop (1280px+) and mobile (375px):
- Ambient gradient bg present
- Single card panel visible, no nested cards
- No overlapping text/controls
- Border + shadow visible on card
- All form fields, toggle, forgot-password link visible
- Submit button loading state works
- Validation errors show in form messages

- [ ] **Stop dev server**

Press Ctrl+C in terminal.

- [ ] **No commit needed for QA** — no files changed.

---

### Self-Review Check

- **Spec coverage:** The plan covers: ambient gradient bg (Task 1), premium panel card with refined spacing/typography (Task 2), visual QA (Task 3). All spec requirements mapped.
- **Placeholders:** None — all file content written inline.
- **Type consistency:** Only one component changed per file. No interface changes.
- **Edge cases:** Unchanged auth handler means all NIY/email/password/validation/loading/redirect behavior is preserved identically.
