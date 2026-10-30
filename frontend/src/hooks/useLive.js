import { useEffect, useState } from "react";
import { get } from "../services/api";
export function useLive(path, interval = 1500) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true,
      timer;
    setData(null);
    setLoading(true);
    const poll = async () => {
      try {
        const value = await get(path);
        if (active) {
          setData(value);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) {
          setLoading(false);
          timer = setTimeout(poll, interval);
        }
      }
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [path, interval]);
  // Polling uses serial requests: slow health checks never stack up.
  return { data, error, loading };
}
