import { useEffect, useState } from "react";
import { getLockStatus, LockStatus } from "../services/loginSecurityService";

export function useLoginLock(email: string) {
  const [remaining, setRemaining] = useState(0);
  const [lockCount, setLockCount] = useState(0);

  const apply = (status: LockStatus) => {
    setRemaining(status.remainingSeconds);
    setLockCount(status.lockCount);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      getLockStatus(email).then(apply);
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  const counting = remaining > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(
      () => setRemaining((r) => Math.max(0, r - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [counting]);

  return { remaining, lockCount, locked: remaining > 0, apply };
}
