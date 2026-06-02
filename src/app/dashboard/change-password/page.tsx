import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeInitialPasswordAction } from './actions';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function paramValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function ChangePasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = paramValue(params, 'error');

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center">
      <section className="w-full rounded-[var(--radius-lg)] border bg-card p-6 elevation-1">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Ganti Password Awal</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Masukkan password baru sebelum membuka dashboard.
            </p>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <form action={changeInitialPasswordAction} className="space-y-4">
          <Input name="password" type="password" placeholder="Password baru" required minLength={8} />
          <Input
            name="confirm_password"
            type="password"
            placeholder="Konfirmasi password baru"
            required
            minLength={8}
          />
          <Button type="submit" className="w-full">Simpan Password</Button>
        </form>
      </section>
    </div>
  );
}
