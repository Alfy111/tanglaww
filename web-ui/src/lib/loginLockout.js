import { supabase } from "./supabase";

const EMPTY = { failures: 0, lockCount: 0, remainingSeconds: 0 };

export const normalizeEmail = (email) => (email || "").trim().toLowerCase();

export const isWrongPasswordError = (error) =>
  error?.code === "invalid_credentials" ||
  /invalid login credentials/i.test(error?.message ?? "");

export const formatRemaining = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export async function getLockStatus(email) {
  if (!normalizeEmail(email)) return EMPTY;
  const { data, error } = await supabase.rpc("login_lock_status", {
    p_email: normalizeEmail(email),
  });
  return error || !data ? EMPTY : data;
}

export async function recordLoginFailure(email) {
  const { data, error } = await supabase.rpc("record_login_failure", {
    p_email: normalizeEmail(email),
  });
  return error || !data ? EMPTY : data;
}

export async function clearLoginFailures() {
  await supabase.rpc("clear_login_failures");
}

export function warningFor(status) {
  if (status.lockMinutes) {
    return {
      title: "Sign-in disabled",
      message: `Too many wrong attempts. Password entry is disabled for ${status.lockMinutes} minutes.`,
      locked: true,
    };
  }
  if (status.failures === 4 && status.lockCount === 0) {
    return {
      title: "Incorrect password",
      message:
        "You have one last attempt. One more wrong password will disable sign-in for 3 minutes.",
      locked: false,
    };
  }
  return null;
}
