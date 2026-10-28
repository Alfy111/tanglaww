const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000;
const STORAGE_PREFIX = "tanglaw-login-lockout";

function getStorageKey(role, email) {
  return `${STORAGE_PREFIX}:${role}:${email.trim().toLowerCase()}`;
}

export function getLockoutMessage(remainingMs) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const duration = minutes > 0
    ? `${minutes} minute${minutes === 1 ? "" : "s"}${seconds > 0 ? ` and ${seconds} second${seconds === 1 ? "" : "s"}` : ""}`
    : `${seconds} second${seconds === 1 ? "" : "s"}`;

  return `You've been temporarily locked out after five unsuccessful sign-in attempts. Please try again in ${duration}. If you need to reset your password, use the “Forgot Password?” link.`;
}

export function getLoginLockout(role, email) {
  if (!email.trim()) return { attempts: 0, remainingMs: 0 };
  const storage = window.localStorage;
  const key = getStorageKey(role, email);
  const saved = storage.getItem(key);
  if (!saved) return { attempts: 0, remainingMs: 0 };

  const state = JSON.parse(saved);
  const remainingMs = Math.max(0, (state.lockedUntil ?? 0) - Date.now());
  if (remainingMs === 0 && state.lockedUntil) {
    storage.removeItem(key);
    return { attempts: 0, remainingMs: 0 };
  }
  return { attempts: state.attempts ?? 0, remainingMs };
}

export function recordFailedLogin(role, email) {
  const storage = window.localStorage;
  const current = getLoginLockout(role, email);
  const attempts = current.attempts + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null;
  storage.setItem(getStorageKey(role, email), JSON.stringify({ attempts, lockedUntil }));
  return { attempts, remainingMs: lockedUntil ? LOCKOUT_DURATION_MS : 0 };
}

export function clearFailedLogins(role, email) {
  if (!email.trim()) return;
  window.localStorage.removeItem(getStorageKey(role, email));
}
