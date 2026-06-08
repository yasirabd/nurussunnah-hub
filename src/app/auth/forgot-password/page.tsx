"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

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

const schema = z.object({
  email: z.string().email("Masukkan email yang valid"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: ${window.location.origin}/auth/callback?next=/auth/reset-password,
    });

    if (error) {
      toast.error("Gagal mengirim email reset. Coba beberapa saat lagi.");
    } else {
      setSentEmail(values.email);
      setSubmitted(true);
    }
    setIsLoading(false);
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Email Terkirim!</h1>
          <p className="text-sm text-muted-foreground">
            Kami telah mengirim link reset password ke{" "}
            <span className="font-medium text-foreground">{sentEmail}</span>.
            Silakan cek inbox Anda.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Tidak menerima email? Periksa folder spam atau{" "}
          <button
            onClick={() => setSubmitted(false)}
            className="font-medium text-primary hover:underline"
          >
            coba lagi
          </button>
          .
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </Link>
        <h1 className="text-2xl font-semibold tracking-normal">Lupa Password?</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Masukkan email terdaftar Anda. Kami akan mengirimkan link untuk
          mengatur ulang password.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="nama@email.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            id="forgot-password-submit"
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Mengirim..." : "Kirim Link Reset"}
          </Button>
        </form>
      </Form>
    </div>
  );
}