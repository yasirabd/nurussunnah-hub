"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/employees", label: "Direktori" },
  { href: "/dashboard/employees/registrations", label: "Validasi Pendaftaran" },
];

export function EmployeesTabs({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const active =
          tab.href === "/dashboard/employees"
            ? pathname === "/dashboard/employees"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.href.endsWith("registrations") && pendingCount ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
