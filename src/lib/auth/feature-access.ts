import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  featureAccessRedirect,
  passwordChangeAccessRedirect,
} from "@/lib/auth/feature-access-policy.mjs";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ServerSupabaseClient = SupabaseClient<Database>;

export type FeatureAccessState =
  | { status: "unauthenticated"; supabase: ServerSupabaseClient }
  | { status: "missing_profile"; supabase: ServerSupabaseClient; user: User }
  | { status: "password_change_required"; supabase: ServerSupabaseClient; user: User }
  | { status: "allowed"; supabase: ServerSupabaseClient; user: User };

type AuthenticatedFeatureAccess = {
  supabase: ServerSupabaseClient;
  user: User;
};

export async function getFeatureAccessState(): Promise<FeatureAccessState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "unauthenticated", supabase };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return { status: "missing_profile", supabase, user };

  return {
    status: profile.must_change_password ? "password_change_required" : "allowed",
    supabase,
    user,
  };
}

export async function requireFeatureAccess(): Promise<AuthenticatedFeatureAccess> {
  const state = await getFeatureAccessState();

  if (state.status === "allowed") return state;
  redirect(featureAccessRedirect(state.status) ?? "/auth/logout");
}

export async function requirePasswordChangeAccess(): Promise<AuthenticatedFeatureAccess> {
  const state = await getFeatureAccessState();

  if (state.status === "password_change_required") return state;
  redirect(passwordChangeAccessRedirect(state.status) ?? "/auth/logout");
}
