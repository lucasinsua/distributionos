import { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase.js";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Simple hook for querying Supabase from dashboard components.
 * Returns { data, loading, error } and re-fetches on deps change.
 */
export function useQuery<T>(
  queryFn: (supabase: ReturnType<typeof getSupabase>) => Promise<T>,
  deps: unknown[] = []
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();

    if (!supabase) {
      setState({ data: null, loading: false, error: "Supabase not configured" });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    queryFn(supabase)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}
