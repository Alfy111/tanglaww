import { normalizeEmail } from "./loginLockout";
import { supabase } from "./supabase";

export const PASSWORD_RULES = [
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
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    message: "Password must contain at least one special character.",
  },
];

export const passwordProblems = (password, confirmPassword) => {
  const problems = PASSWORD_RULES.filter((r) => !r.test(password)).map(
    (r) => r.message,
  );
  if (password !== confirmPassword) problems.push("Passwords do not match.");
  return problems;
};

async function callPasswordReset(body) {
  const { data, error } = await supabase.functions.invoke("password-reset", {
    body,
  });
  if (error) throw new Error(error.message);
  if (!data?.success)
    throw new Error(data?.error ?? "Something went wrong. Please try again.");
}

export const sendResetCode = (email) =>
  callPasswordReset({ action: "send", email: normalizeEmail(email) });

export const resetPasswordWithCode = (email, code, password) =>
  callPasswordReset({
    action: "reset",
    email: normalizeEmail(email),
    code,
    password,
  });
