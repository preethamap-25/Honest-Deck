import { useState, useCallback, useEffect, useRef } from "react";
import { getAdminStats, getQueue, getActivity, listClaims, getLiveFeed, getAlerts } from "../utils/api";

export function useDashboard() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [activity, setActivity] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

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
      setRecentClaims(data.items || data.claims || data.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadActivity = useCallback(async (limit = 50) => {
    try {
      setError(null);
      const data = await getActivity({ limit });
      setActivity(data.activity || data.data || data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadLiveFeed = useCallback(async (limit = 20) => {
    try {
      setError(null);
      const data = await getLiveFeed(limit);
      setLiveFeed(data.items || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      const data = await getAlerts();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        loadStats(),
        loadQueue(),
        loadRecentClaims(),
        loadActivity(),
        loadLiveFeed(),
        loadAlerts(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadStats, loadQueue, loadRecentClaims, loadActivity, loadLiveFeed, loadAlerts]);

  // Dynamic polling — refresh feed every 30 seconds for real-time updates
  const startPolling = useCallback((intervalMs = 30000) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      loadLiveFeed();
      loadAlerts();
      loadStats();
    }, intervalMs);
  }, [loadLiveFeed, loadAlerts, loadStats]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  return {
    stats,
    queue,
    recentClaims,
    activity,
    liveFeed,
    alerts,
    isLoading,
    error,
    loadStats,
    loadQueue,
    loadRecentClaims,
    loadActivity,
    loadLiveFeed,
    loadAlerts,
    loadAll,
    startPolling,
    stopPolling,
  };
}
