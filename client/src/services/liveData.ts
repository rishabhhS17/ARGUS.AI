import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "./gemini";

// Replaces the old Socket.IO channel: views poll GET /api/data with the last version they
// saw, and the server replies { unchanged: true } (no DB work) until something is written.
export const POLL_INTERVAL_MS = 4000;

export interface LiveData {
  incidents: any[];
  units: any[];
  advisories: any[];
  leads: any[]; // unplaced reports (city/region-level location)
}

const EMPTY: LiveData = { incidents: [], units: [], advisories: [], leads: [] };

export function useLiveData(intervalMs = POLL_INTERVAL_MS) {
  const [data, setData] = useState<LiveData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const versionRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const rerunRef = useRef(false);

  // Call after your own writes to see the result immediately instead of on the next tick.
  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      // A poll that started before our write may return stale data; run once more after it.
      rerunRef.current = true;
      return;
    }
    inFlightRef.current = true;

    try {
      const since = versionRef.current ? `?since=${encodeURIComponent(versionRef.current)}` : "";
      const res = await fetch(`${API_URL}/api/data${since}`, { cache: "no-store" });
      if (!res.ok) return;

      const body = await res.json();
      versionRef.current = body.version ?? null;
      if (body.unchanged) return;

      setData({
        incidents: body.incidents || [],
        units: body.units || [],
        advisories: body.advisories || [],
        leads: body.leads || [],
      });
      setLoaded(true);
    } catch {
      // Network blip or cold start: the next tick retries.
    } finally {
      inFlightRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        void refresh();
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!document.hidden) await refresh();
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };
    // Background tabs stop polling; catch up as soon as the tab is visible again.
    const onVisibility = () => {
      if (!document.hidden) void refresh();
    };

    void tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, intervalMs]);

  return { ...data, loaded, refresh };
}
