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
    <Card>
      <CardHeader className="pt-8 pb-6 text-center">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-primary shadow-sm">
            <span className="text-base font-bold text-primary-foreground">N</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-base font-semibold text-foreground">Nurussunnah Hub</p>
            <p className="text-xs text-muted-foreground">Portal SDM Internal</p>
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-[20px] font-normal tracking-wide text-foreground">
            Assalamu&apos;alaikum
          </h1>
          <p className="text-sm font-light tracking-wide text-muted-foreground/80">
            warahmatullahi wabarakatuh
          </p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Masuk dengan email atau NIY untuk melanjutkan.
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
