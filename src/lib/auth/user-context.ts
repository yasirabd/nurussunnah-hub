import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ActiveStatus, EmployeeStatus, UserRoleEnum } from "@/types/database";

type DashboardProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_status: EmployeeStatus;
  home_unit_id: string | null;
  active_status: ActiveStatus;
  must_change_password: boolean;
  units: { id: string; name: string; code: string } | null;
};

export type DashboardUserContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: DashboardProfile | null;
  roles: UserRoleEnum[];
  isAdmin: boolean;
  isHrd: boolean;
  isKepalaUnit: boolean;
};

export const getDashboardUserContext = cache(
  async (): Promise<DashboardUserContext | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, employee_status, active_status, home_unit_id, must_change_password, units!profiles_home_unit_id_fkey(id, name, code)"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const roles = (roleRows ?? []).map((row) => row.role as UserRoleEnum);

    return {
      supabase,
      user,
      profile: profile as DashboardProfile | null,
      roles,
      isAdmin: roles.includes("ADMIN"),
      isHrd: roles.includes("HRD"),
      isKepalaUnit: roles.includes("KEPALA_UNIT"),
    };
  }
);
