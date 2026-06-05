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
