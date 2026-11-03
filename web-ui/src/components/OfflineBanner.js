import { CloudOff, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CHECK_MS = 30_000;

async function canReachInternet() {
  if (!navigator.onLine) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${window.location.origin}/favicon.ico?ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(!navigator.onLine);
  const hideTimer = useRef(null);

  useEffect(() => {
    const update = (isOffline) => {
      setOffline(isOffline);
      if (isOffline) {
        wasOffline.current = true;
        setBackOnline(false);
      } else if (wasOffline.current) {
        wasOffline.current = false;
        setBackOnline(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setBackOnline(false), 2500);
      }
    };
    const check = async () => update(!(await canReachInternet()));
    const goOffline = () => update(true);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", check);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, CHECK_MS);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", check);
      clearInterval(interval);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (!offline && !backOnline) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "8px 16px",
        backgroundColor: offline ? "#D93025" : "#1E8E3E",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 600,
        fontFamily: "Poppins, sans-serif",
        textAlign: "center",
      }}
    >
      {offline ? <CloudOff size={16} /> : <Wifi size={16} />}
      {offline
        ? "No internet connection. Some features won't work until you're back online."
        : "Back online"}
    </div>
  );
}
