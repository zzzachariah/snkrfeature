import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminContext = {
  userId: string;
  username: string;
  role: "admin";
};

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("username, role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin") return null;

  return {
    userId: user.id,
    username: profile.username,
    role: "admin"
  };
}

export async function requireAdminPageContext() {
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect("/admin/login");
  }
  return ctx;
}
