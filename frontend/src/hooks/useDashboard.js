import { useState, useCallback } from "react";
import { getAdminStats, getQueue, getActivity, listClaims } from "../utils/api";

export function useDashboard() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadQueue = useCallback(async (status = "pending", limit = 50) => {
    try {
      setError(null);
      const data = await getQueue({ status, limit });
      setQueue(data.queue || data.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadRecentClaims = useCallback(async () => {
    try {
      setError(null);
      const data = await listClaims({ page: 1, pageSize: 10, order: "desc" });
      setRecentClaims(data.claims || data.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadActivity = useCallback(async (limit = 50) => {
    try {
      setError(null);
      const data = await getActivity({ limit });
      setActivity(data.activity || data.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([loadStats(), loadQueue(), loadRecentClaims(), loadActivity()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadStats, loadQueue, loadRecentClaims, loadActivity]);

  return {
    stats,
    queue,
    recentClaims,
    activity,
    isLoading,
    error,
    loadStats,
    loadQueue,
    loadRecentClaims,
    loadActivity,
    loadAll,
  };
}
