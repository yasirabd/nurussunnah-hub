import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Building2, CalendarDays, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardUserContext } from '@/lib/auth/user-context';

export const metadata: Metadata = { title: 'Pengaturan - Nurussunnah Hub' };

export default async function SettingsPage() {
  const context = await getDashboardUserContext();
  if (!context) redirect('/auth/login');
  if (!context.isAdmin) redirect('/dashboard');

  const items = [
    { href: '/dashboard/units', icon: Building2, title: 'Unit & Organisasi', description: 'Kelola struktur yayasan dan unit sekolah.' },
    { href: '/dashboard/academic-years', icon: CalendarDays, title: 'Tahun Pelajaran', description: 'Atur periode aktif workflow.' },
    { href: '/dashboard/employees', icon: Users, title: 'Pegawai', description: 'Kelola data operasional pegawai.' },
  ];

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-normal'>Pengaturan</h1>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>Pusat konfigurasi Admin untuk data inti dan keamanan akun.</p>
        </div>
        <Badge className='h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary'>Admin</Badge>
      </div>

      <section className='grid gap-4 md:grid-cols-3'>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className='rounded-[var(--radius-md)] border bg-card p-4 elevation-1 transition-colors hover:border-primary/30 hover:bg-primary/5'>
              <Icon className='h-5 w-5 text-primary' />
              <h2 className='mt-3 font-semibold'>{item.title}</h2>
              <p className='mt-1 text-sm leading-6 text-muted-foreground'>{item.description}</p>
            </Link>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'><ShieldCheck className='h-4 w-4 text-primary' />Keamanan</CardTitle>
          <CardDescription>Pengaturan keamanan Supabase yang perlu dijaga dari dashboard proyek.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2 text-sm leading-6 text-muted-foreground'>
          <p>Aktifkan leaked password protection di Supabase Auth dashboard.</p>
          <p>Review warning Security Advisor setelah perubahan RPC/RLS.</p>
        </CardContent>
      </Card>
    </div>
  );
}
