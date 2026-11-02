// Realtime notification feed (web).
// Reads the "app_notification" table and listens for new rows, so the
// list and the unread badge update instantly.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export const KIND_LABELS = {
  calendar_event: "Calendar Event",
  online_session: "Online Session",
  announcement: "Announcement",
  quiz: "New Quiz/Exam",
  enrollment: "New Enrollment",
  balance_receipt: "Balance Receipt Uploaded",
};

const FEED_LIMIT = 100;
const HOUR = 60 * 60 * 1000;
const ms = (iso) => (iso ? new Date(iso).getTime() : 0);

/** Events/sessions that start within the next hour. */
export const startingSoon = (items, now = Date.now()) =>
  items.filter(
    (n) => n.event_at && ms(n.event_at) > now && ms(n.event_at) - now <= HOUR,
  );

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// Lets every open copy of the feed (e.g. sidebar badge + page) stay in sync
const STATE_EVENT = "tanglaw:notif-state";
const announceState = (changes) =>
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: changes }));

async function saveState(changes) {
  announceState(changes);
  const userId = await currentUserId();
  if (!userId) return;
  await supabase
    .from("notification_state")
    .upsert({ auth_id: userId, ...changes }, { onConflict: "auth_id" });
}

export function useNotificationFeed(audience) {
  const [items, setItems] = useState([]);
  const [lastReadAt, setLastReadAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const clearedAtRef = useRef(null);

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
    if (!error && data) setItems(data);
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
            const id = payload.old?.id;
            setItems((prev) => prev.filter((n) => n.id !== id));
            return;
          }
          const row = payload.new;
          if (row.audience !== audience) return;
          if (
            clearedAtRef.current &&
            ms(row.created_at) <= ms(clearedAtRef.current)
          )
            return;
          setItems((prev) =>
            [row, ...prev.filter((n) => n.id !== row.id)].sort(
              (a, b) => ms(b.created_at) - ms(a.created_at),
            ),
          );
        },
      )
      .subscribe();

    // Catch up when the tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", load);
    const onState = (e) => {
      const { last_read_at, cleared_at } = e.detail || {};
      if (last_read_at) setLastReadAt(last_read_at);
      if (cleared_at) {
        clearedAtRef.current = cleared_at;
        setItems((prev) =>
          prev.filter((n) => ms(n.created_at) > ms(cleared_at)),
        );
      }
    };
    window.addEventListener(STATE_EVENT, onState);
    const tick = setInterval(() => setNow(Date.now()), 60_000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", load);
      window.removeEventListener(STATE_EVENT, onState);
      clearInterval(tick);
    };
  }, [audience, load]);

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

  const isUnread = useCallback(
    (n) => !lastReadAt || ms(n.created_at) > ms(lastReadAt),
    [lastReadAt],
  );

  return {
    items,
    loading,
    unreadCount: items.filter(isUnread).length,
    isUnread,
    soon: startingSoon(items, now),
    markAllRead,
    clearAll,
    refresh: load,
  };
}
