import { FeedItem, KIND_LABELS } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";

const REMINDED_KEY = "notifSoonReminded";
export const POPUPS_KEY = "notifPopups";
const popupsOn = async () => {
  try {
    return (await AsyncStorage.getItem(POPUPS_KEY)) !== "off";
  } catch {
    return true;
  }
};
const HOUR = 60 * 60 * 1000;

export default function NotificationToaster() {
  const router = useRouter();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    const openList = (n: FeedItem) => {
      Toast.hide();
      router.push(
        (n.audience === "admin"
          ? "/admin/notification"
          : "/notification") as any,
      );
    };

    const remindStartingSoon = async () => {
      if (AppState.currentState !== "active" || !(await popupsOn())) return;
      const now = new Date();
      const { data } = await supabase
        .from("app_notification")
        .select("*")
        .gt("event_at", now.toISOString())
        .lte("event_at", new Date(now.getTime() + HOUR).toISOString());
      if (!data?.length) return;

      let reminded: number[] = [];
      try {
        reminded = JSON.parse(
          (await AsyncStorage.getItem(REMINDED_KEY)) ?? "[]",
        );
      } catch {}
      const next = (data as FeedItem[]).find((n) => !reminded.includes(n.id));
      if (!next) return;

      const mins = Math.max(
        1,
        Math.round((new Date(next.event_at!).getTime() - Date.now()) / 60000),
      );
      Toast.show({
        type: "info",
        text1: `Starting in ${mins} min`,
        text2: next.title,
        position: "top",
        visibilityTime: 6000,
        onPress: () => openList(next),
      });
      try {
        await AsyncStorage.setItem(
          REMINDED_KEY,
          JSON.stringify([...reminded, next.id].slice(-50)),
        );
      } catch {}
    };

    const stop = () => {
      if (channel) supabase.removeChannel(channel);
      channel = null;
      if (timer) clearInterval(timer);
      timer = null;
    };

    const start = async () => {
      stop();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      channel = supabase
        .channel(`notif-toast-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "app_notification" },
          async (payload) => {
            if (!(await popupsOn())) return;
            const n = payload.new as FeedItem;
            Toast.show({
              type: "info",
              text1: KIND_LABELS[n.kind] ?? "New notification",
              text2: n.title,
              position: "top",
              visibilityTime: 5000,
              onPress: () => openList(n),
            });
          },
        )
        .subscribe();

      remindStartingSoon();
      timer = setInterval(remindStartingSoon, 60_000);
    };

    start();
    const { data: auth } = supabase.auth.onAuthStateChange((event) => {
      setTimeout(() => {
        if (event === "SIGNED_OUT") stop();
        else if (event === "SIGNED_IN") start();
      }, 0);
    });

    return () => {
      stop();
      auth.subscription.unsubscribe();
    };
  }, []);

  return null;
}
