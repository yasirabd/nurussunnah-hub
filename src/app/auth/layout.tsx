export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="portal-auth flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-10 sm:px-8">
      <div className="w-full max-w-[440px]">{children}</div>
      <p className="text-center text-xs text-muted-foreground">Yayasan Islam Nurus Sunnah · Portal kepegawaian</p>
    </main>
  );
}
