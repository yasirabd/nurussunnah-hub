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
    <div className="space-y-8">
      {/* Mobile brand */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary shadow-sm">
          <span className="text-sm font-bold text-primary-foreground">N</span>
        </div>
        <span className="font-semibold text-base">Nurussunnah Hub</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-normal text-foreground">
          Masuk ke Sistem
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gunakan email atau NIY beserta password Anda
        </p>
      </div>

      {/* Form */}
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
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Password</FormLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
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

      <p className="text-center text-xs text-muted-foreground">
        Belum punya akun? Hubungi{" "}
        <span className="font-semibold text-foreground">Admin / HRD</span> untuk pendaftaran.
      </p>
    </div>
  );
}
