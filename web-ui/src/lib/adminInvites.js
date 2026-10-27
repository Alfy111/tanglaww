import { supabase } from "./supabase";

export async function verifyAdminInvite(email, code) {
  const { data, error } = await supabase.rpc("verify_admin_invite", {
    p_email: email.trim().toLowerCase(),
    p_code: code,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? "The invite code is invalid or expired.");
  return data;
}

export async function activateAdmin(email, code, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });

  let userId = signUpData?.user?.id ?? null;
  if (signUpError) {
    if (!/already registered|already exists/i.test(signUpError.message)) {
      throw new Error(signUpError.message);
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError) {
      throw new Error("This email already has a Tanglaw account. Enter that account's current password.");
    }
    userId = signInData.user?.id ?? null;
  } else if (!signUpData?.session) {
    throw new Error("Account created, but email confirmation is enabled in Supabase. Confirm your email before activating the admin invite.");
  }

  if (!userId) throw new Error("Could not create or sign in to the account.");

  const { error: acceptError } = await supabase.rpc("accept_admin_invite", {
    p_code: code,
  });
  if (acceptError) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) {
      throw new Error(`${acceptError.message}. Could not sign out after the failed activation: ${signOutError.message}`);
    }
    throw new Error(acceptError.message);
  }

  return userId;
}
