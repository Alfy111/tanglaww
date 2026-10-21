import { supabase } from "../lib/supabase";

export type AdminRole = "owner" | "super_admin" | "admin";

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  super_admin: "Super Admin",
  admin: "Admin",
};

export interface TeamAdmin {
  admin_id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface TeamInvite {
  invite_id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  expiresAt: string;
}

export interface AdminTeam {
  myRole: AdminRole;
  admins: TeamAdmin[];
  invites: TeamInvite[];
}

export async function getMyAdminRole(): Promise<AdminRole | null> {
  const { data, error } = await supabase.rpc("my_admin_role");
  if (error) return null;
  return (data as AdminRole) ?? null;
}

export async function getAdminTeam(): Promise<AdminTeam> {
  const { data, error } = await supabase.rpc("get_admin_team");
  if (error) throw new Error(error.message);
  return data as AdminTeam;
}

export async function sendAdminInvite(invite: {
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "super_admin";
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("send-admin-invite", {
    body: invite,
  });
  if (error) throw new Error(error.message);
  if (!data?.success)
    throw new Error(data?.error ?? "Could not send the invite.");
}

export async function cancelAdminInvite(inviteId: number): Promise<void> {
  const { error } = await supabase.rpc("cancel_admin_invite", {
    p_invite_id: inviteId,
  });
  if (error) throw new Error(error.message);
}

export async function verifyAdminInvite(
  email: string,
  code: string,
): Promise<{ firstName: string; lastName: string; role: AdminRole }> {
  const { data, error } = await supabase.rpc("verify_admin_invite", {
    p_email: email.trim().toLowerCase(),
    p_code: code,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? "Invalid code.");
  return data;
}

export async function activateAdmin(
  email: string,
  code: string,
  password: string,
): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();

  let userId: string | null = null;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (signUpError) {
    if (!/already registered|already exists/i.test(signUpError.message)) {
      throw new Error(signUpError.message);
    }
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (signInError) {
      throw new Error(
        "This email already has a Tanglaw account. Enter that account's current password.",
      );
    }
    userId = signInData.user.id;
  } else {
    if (!signUpData.session) {
      throw new Error(
        "Account created, but email confirmation is turned on in Supabase. Turn it off, or confirm the email first.",
      );
    }
    userId = signUpData.user?.id ?? null;
  }
  if (!userId) throw new Error("Could not create the account.");

  const { error: acceptError } = await supabase.rpc("accept_admin_invite", {
    p_code: code,
  });
  if (acceptError) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error(acceptError.message);
  }
  return userId;
}
