'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return toast.error('Password minimal 8 karakter.');
    if (password !== confirmPassword) return toast.error('Konfirmasi password tidak sama.');
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message.includes('Auth session missing') ? 'Link reset sudah kedaluwarsa.' : error.message);
    toast.success('Password berhasil diperbarui.');
    window.location.href = '/dashboard';
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-normal'>Atur Password Baru</h1>
        <p className='mt-2 text-sm text-muted-foreground'>Masukkan password baru.</p>
      </div>
      <form onSubmit={onSubmit} className='space-y-4'>
        <Input type='password' placeholder='Password baru' value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} />
        <Input type='password' placeholder='Konfirmasi password' value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={loading} />
        <Button type='submit' className='w-full' disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Password'}</Button>
      </form>
    </div>
  );
}
