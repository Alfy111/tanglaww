import { useEffect, useState } from "react";
import { getLockStatus } from "./loginLockout";

export function useLoginLock(email) {
  const [remaining, setRemaining] = useState(0);
  const [lockCount, setLockCount] = useState(0);

  const apply = (status) => {
    setRemaining(status.remainingSeconds ?? 0);
    setLockCount(status.lockCount ?? 0);
  };

  useEffect(() => {
    const timer = window.setTimeout(
      () => getLockStatus(email).then(apply),
      400,
    );
    return () => window.clearTimeout(timer);
  }, [email]);

  const counting = remaining > 0;
  useEffect(() => {
    if (!counting) return undefined;
    const timer = window.setInterval(
      () => setRemaining((r) => Math.max(0, r - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [counting]);

  return { remaining, lockCount, locked: remaining > 0, apply };
}
