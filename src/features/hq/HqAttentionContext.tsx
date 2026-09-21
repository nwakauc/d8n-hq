import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchHqAttention, hqErrorMessage } from "../../lib/hq/api.ts";
import type { HqAttention } from "../../lib/hq/types.ts";
import { useHqOperator } from "./useHqOperator.ts";

type HqAttentionValue = {
  attention: HqAttention | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Context = createContext<HqAttentionValue | null>(null);

export function HqAttentionProvider({ children }: { children: ReactNode }) {
  const { status, operator } = useHqOperator();
  const [attention, setAttention] = useState<HqAttention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (status !== "ready" || !operator) return;
    setLoading(true);
    try {
      setAttention(await fetchHqAttention());
      setError(null);
    } catch (caught) {
      setError(hqErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [operator, status]);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
    const interval = window.setInterval(() => void refresh(), 15_000);
    const onRefresh = () => void refresh();
    window.addEventListener("hq:attention-refresh", onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("hq:attention-refresh", onRefresh);
    };
  }, [refresh]);

  const value = useMemo(() => ({ attention, loading, error, refresh }), [attention, error, loading, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHqAttention(): HqAttentionValue {
  const value = useContext(Context);
  if (!value) throw new Error("useHqAttention must be used within HqAttentionProvider");
  return value;
}

// eslint-disable-next-line react-refresh/only-export-components
export function requestHqAttentionRefresh() {
  window.dispatchEvent(new Event("hq:attention-refresh"));
}
