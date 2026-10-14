import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

const TOKEN_KEY = "tarc_session_token";
const STUDENT_ID_KEY = "tarc_student_id";

export const generateSessionToken = async (): Promise<string> => {
  return Crypto.randomUUID();
};

export const clearLocalSession = async (): Promise<void> => {
  await AsyncStorage.multiRemove([TOKEN_KEY, STUDENT_ID_KEY]);
};

export const registerSession = async (
  studentId: number,
  token: string,
): Promise<void> => {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [STUDENT_ID_KEY, studentId.toString()],
  ]);

  const { data, error } = await supabase
    .from("student")
    .update({
      session_token: token,
      session_created_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .select("id");

  if (error || !data || data.length === 0) {
    await clearLocalSession();
    console.error(
      "[session] registerSession failed",
      error ?? "0 rows updated",
    );
    throw new Error("We couldn't start your session. Please try again.");
  }
};

export const validateSession = async (
  expectedStudentId?: number,
): Promise<{ valid: boolean; studentId: number | null }> => {
  const [[, storedToken], [, storedId]] = await AsyncStorage.multiGet([
    TOKEN_KEY,
    STUDENT_ID_KEY,
  ]);

  if (!storedToken || !storedId) return { valid: false, studentId: null };

  const studentId = parseInt(storedId, 10);

  if (expectedStudentId !== undefined && studentId !== expectedStudentId) {
    await clearLocalSession();
    return { valid: false, studentId: null };
  }

  const { data, error } = await supabase
    .from("student")
    .select("session_token")
    .eq("id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { valid: false, studentId };

  return { valid: data.session_token === storedToken, studentId };
};

export const clearSession = async (studentId?: number): Promise<void> => {
  const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
  await clearLocalSession();

  if (studentId && storedToken) {
    const { error } = await supabase
      .from("student")
      .update({ session_token: null, session_created_at: null })
      .eq("id", studentId)
      .eq("session_token", storedToken);
    if (error) console.warn("[session] clearSession failed", error);
  }
};

export const logoutStudent = async (): Promise<void> => {
  const studentId = await getStoredStudentId();
  try {
    await clearSession(studentId ?? undefined);
  } catch (err) {
    console.warn("[session] logout cleanup failed", err);
  }
  await supabase.auth.signOut({ scope: "local" });
};

export const getStoredStudentId = async (): Promise<number | null> => {
  const id = await AsyncStorage.getItem(STUDENT_ID_KEY);
  return id ? parseInt(id, 10) : null;
};
