import { useState, useCallback } from "react";
import { listClaims, searchClaims, getClaim, submitClaim, updateClaim, deleteClaim } from "../utils/api";

export function useClaims() {
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });

  const loadClaims = useCallback(async (options = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await listClaims(options);
      setClaims(result.claims || result.data || []);
      if (result.total !== undefined) {
        setPagination((prev) => ({
          ...prev,
          total: result.total,
          ...options,
        }));
      }
    } catch (err) {
      setError(err.message);
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback(async (query, options = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await searchClaims(query, options);
      setClaims(result.claims || result.data || []);
      if (result.total !== undefined) {
        setPagination((prev) => ({
          ...prev,
          total: result.total,
          ...options,
        }));
      }
    } catch (err) {
      setError(err.message);
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClaim_ = useCallback(async (claimId) => {
    try {
      setIsLoading(true);
      setError(null);
      const claim = await getClaim(claimId);
      return claim;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(async (text) => {
    try {
      setIsLoading(true);
      setError(null);
      const claim = await submitClaim(text);
      setClaims((prev) => [claim, ...prev]);
      return claim;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = useCallback(async (claimId, data) => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await updateClaim(claimId, data);
      setClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      return updated;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const delete_ = useCallback(async (claimId) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteClaim(claimId);
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    claims,
    isLoading,
    error,
    pagination,
    loadClaims,
    search,
    getClaim: getClaim_,
    create,
    update,
    delete: delete_,
  };
}
