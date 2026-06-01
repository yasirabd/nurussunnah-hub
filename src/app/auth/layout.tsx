import { Building2, CalendarDays, MessageSquareMore, Users } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left panel — MD3 hero */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-14">
        {/* Subtle background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, var(--sidebar-primary) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--accent) 0%, transparent 40%)",
          }}
        />

        <div className="relative space-y-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-sidebar-primary shadow-lg">
              <span className="text-lg font-bold text-sidebar-primary-foreground">N</span>
            </div>
            <div>
              <p className="text-base font-semibold tracking-normal">Nurussunnah Hub</p>
              <p className="text-xs text-white/55">Yayasan Islam Nurus Sunnah</p>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-lg space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">
              Portal SDM Internal
            </p>
            <h1 className="text-4xl font-semibold leading-[1.15] tracking-normal">
              Kelola data pegawai, unit kerja, dan feedback dalam satu tempat.
            </h1>
            <p className="text-sm leading-7 text-white/62">
              Dirancang untuk HRD, kepala unit, dan pegawai agar pekerjaan
              administrasi tahunan lebih mudah dipantau.
            </p>
          </div>

          {/* Feature chips */}
          <div className="grid max-w-md grid-cols-2 gap-3">
            {[
              { icon: Users, label: "Direktori pegawai" },
              { icon: CalendarDays, label: "Tahun pelajaran" },
              { icon: MessageSquareMore, label: "Feedback rekan" },
              { icon: Building2, label: "Unit organisasi" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-sidebar-primary" />
                  <span className="text-sm text-white/82">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-white/38">
          &copy; {new Date().getFullYear()} Yayasan Islam Nurus Sunnah. Hak cipta dilindungi.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center bg-background px-6 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
