import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export type Audience = "student" | "admin";

export type FeedItem = {
  id: number;
  audience: Audience;
  kind:
    | "calendar_event"
    | "online_session"
    | "announcement"
    | "quiz"
    | "enrollment"
    | "balance_receipt";
  ref_id: number | null;
  title: string;
  body: string | null;
  course_id: number | null;
  event_at: string | null;
  link: string | null;
  created_at: string;
};

export const KIND_LABELS: Record<FeedItem["kind"], string> = {
  calendar_event: "Calendar Event Posted!",
  online_session: "Online Session Posted!",
  announcement: "Announcement Posted!",
  quiz: "New Quiz/Exam Posted!",
  enrollment: "New Enrollment",
  balance_receipt: "Balance Receipt Uploaded",
};

const FEED_LIMIT = 100;
const HOUR = 60 * 60 * 1000;

/** Events/sessions that start within the next hour. */
export const startingSoon = (items: FeedItem[], now = Date.now()) =>
  items.filter((n) => {
    if (!n.event_at) return false;
    const t = new Date(n.event_at).getTime();
    return t > now && t - now <= HOUR;
  });

const ms = (iso: string | null | undefined) =>
  iso ? new Date(iso).getTime() : 0;

type StateChange = { last_read_at?: string; cleared_at?: string };
const stateListeners = new Set<(c: StateChange) => void>();

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function useNotificationFeed(audience: Audience) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const clearedAtRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const userId = await currentUserId();
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: state } = await supabase
      .from("notification_state")
      .select("last_read_at, cleared_at")
      .eq("auth_id", userId)
      .maybeSingle();
    clearedAtRef.current = state?.cleared_at ?? null;
    setLastReadAt(state?.last_read_at ?? null);

    let query = supabase
      .from("app_notification")
      .select("*")
      .eq("audience", audience)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT);
    if (state?.cleared_at) query = query.gt("created_at", state.cleared_at);
    const { data, error } = await query;
    if (!error && data) setItems(data as FeedItem[]);
    setLoading(false);
  }, [audience]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`notif-${audience}-${Date.now()}-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_notification" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as any)?.id;
            setItems((prev) => prev.filter((n) => n.id !== id));
            return;
          }
          const row = payload.new as FeedItem;
          if (row.audience !== audience) return;
          if (
            clearedAtRef.current &&
            ms(row.created_at) <= ms(clearedAtRef.current)
          )
            return;
          setItems((prev) => {
            const rest = prev.filter((n) => n.id !== row.id);
            return [row, ...rest].sort(
              (a, b) => ms(b.created_at) - ms(a.created_at),
            );
          });
        },
      )
      .subscribe();

    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active") load();
    });
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    const onState = (c: StateChange) => {
      if (c.last_read_at) setLastReadAt(c.last_read_at);
      if (c.cleared_at) {
        clearedAtRef.current = c.cleared_at;
        setItems((prev) =>
          prev.filter((n) => ms(n.created_at) > ms(c.cleared_at)),
        );
      }
    };
    stateListeners.add(onState);

    return () => {
      stateListeners.delete(onState);
      supabase.removeChannel(channel);
      appState.remove();
      clearInterval(tick);
    };
  }, [audience, load]);

  const saveState = async (changes: StateChange) => {
    stateListeners.forEach((fn) => fn(changes));
    const userId = await currentUserId();
    if (!userId) return;
    await supabase
      .from("notification_state")
      .upsert({ auth_id: userId, ...changes }, { onConflict: "auth_id" });
  };

  const markAllRead = useCallback(async () => {
    const stamp = new Date().toISOString();
    setLastReadAt(stamp);
    await saveState({ last_read_at: stamp });
  }, []);

  const clearAll = useCallback(async () => {
    const stamp = new Date().toISOString();
    clearedAtRef.current = stamp;
    setItems([]);
    setLastReadAt(stamp);
    await saveState({ cleared_at: stamp, last_read_at: stamp });
  }, []);

  const isUnread = (n: FeedItem) =>
    !lastReadAt || ms(n.created_at) > ms(lastReadAt);
  const unreadCount = items.filter(isUnread).length;

  return {
    items,
    loading,
    lastReadAt,
    unreadCount,
    isUnread,
    soon: startingSoon(items, now),
    markAllRead,
    clearAll,
    refresh: load,
  };
}
