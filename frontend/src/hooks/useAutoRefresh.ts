import { useEffect } from "react";

export function useAutoRefresh(callback: () => void, intervalMs: number) {
  useEffect(() => {
    callback();
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, []);
}
