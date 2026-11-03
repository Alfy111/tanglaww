import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export const PUSH_ENABLED_KEY = "tanglaw_push_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getStudentId(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("student")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function registerPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Tanglaw notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== "granted") {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResult = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  const studentId = await getStudentId();
  if (!studentId) return null;

  const enabled =
    (await AsyncStorage.getItem(PUSH_ENABLED_KEY)) !== "false";
  await supabase.from("push_tokens").upsert(
    {
      student_id: studentId,
      expo_push_token: tokenResult.data,
      platform: Platform.OS,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" },
  );
  return tokenResult.data;
}

export async function setPushNotificationsEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, enabled ? "true" : "false");
  if (!enabled) {
    const studentId = await getStudentId();
    if (!studentId) return;
    await supabase
      .from("push_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("student_id", studentId);
    return;
  }
  await registerPushNotifications();
}

export async function getPushNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_ENABLED_KEY)) !== "false";
}
