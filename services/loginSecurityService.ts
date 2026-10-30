import { supabase } from "../lib/supabase";

export type LockStatus = {
  failures: number;
  lockCount: number;
  remainingSeconds: number;
  lockMinutes?: number;
};

const EMPTY: LockStatus = { failures: 0, lockCount: 0, remainingSeconds: 0 };

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isWrongPasswordError = (error: any) =>
  error?.code === "invalid_credentials" ||
  /invalid login credentials/i.test(error?.message ?? "");

export const formatRemaining = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export async function getLockStatus(email: string): Promise<LockStatus> {
  if (!email) return EMPTY;
  const { data, error } = await supabase.rpc("login_lock_status", {
    p_email: normalizeEmail(email),
  });
  if (error) return EMPTY;
  return (data as LockStatus) ?? EMPTY;
}

export async function recordLoginFailure(email: string): Promise<LockStatus> {
  const { data, error } = await supabase.rpc("record_login_failure", {
    p_email: normalizeEmail(email),
  });
  if (error) return EMPTY;
  return (data as LockStatus) ?? EMPTY;
}

export async function clearLoginFailures(): Promise<void> {
  await supabase.rpc("clear_login_failures");
}

async function callPasswordReset(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("password-reset", {
    body,
  });
  if (error) throw new Error(error.message);
  if (!data?.success)
    throw new Error(data?.error ?? "Something went wrong. Please try again.");
}

export const sendResetCode = (email: string) =>
  callPasswordReset({ action: "send", email: normalizeEmail(email) });

export const resetPasswordWithCode = (
  email: string,
  code: string,
  password: string,
) =>
  callPasswordReset({
    action: "reset",
    email: normalizeEmail(email),
    code,
    password,
  });

export const PASSWORD_RULES: {
  test: (p: string) => boolean;
  message: string;
}[] = [
  {
    test: (p) => p.length >= 8,
    message: "Password must be at least 8 characters.",
  },
  {
    test: (p) => /[0-9]/.test(p),
    message: "Password must contain at least one number.",
  },
  {
    test: (p) => /[a-z]/.test(p),
    message: "Password must contain at least one lowercase letter.",
  },
  {
    test: (p) => /[A-Z]/.test(p),
    message: "Password must contain at least one uppercase letter.",
  },
  {
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    message: "Password must contain at least one special character.",
  },
];
