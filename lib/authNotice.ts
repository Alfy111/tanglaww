import AsyncStorage from "@react-native-async-storage/async-storage";

export type LogoutReason = "other_device" | "session_expired";

const KEY = "logout_reason";

export const LOGOUT_MESSAGES: Record<LogoutReason, string> = {
  other_device:
    "You were signed out because your account was signed in on another device. If this wasn't you, change your password.",
  session_expired: "Your session has expired. Please sign in again.",
};

export async function setLogoutReason(reason: LogoutReason) {
  try {
    await AsyncStorage.setItem(KEY, reason);
  } catch {}
}

export async function consumeLogoutReason(): Promise<string | null> {
  try {
    const reason = (await AsyncStorage.getItem(KEY)) as LogoutReason | null;
    if (!reason) return null;
    await AsyncStorage.removeItem(KEY);
    return LOGOUT_MESSAGES[reason] ?? null;
  } catch {
    return null;
  }
}
