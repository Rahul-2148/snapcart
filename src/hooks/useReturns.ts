// src/hooks/useReturns.ts
import { useCallback, useState } from "react";

interface CreateReturnParams {
  orderId: string;
  orderItemId: string;
  requestType: "return" | "replacement";
  reason: string;
  description?: string;
  images?: Array<{ url: string; publicId: string }>;
}

export const useReturns = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReturn = useCallback(async (params: CreateReturnParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/returns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create return request");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReturns = useCallback(
    async (status?: string, page: number = 1, limit: number = 10) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (status) params.append("status", status);

        const response = await fetch(`/api/returns/list?${params}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch returns");
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getReturnDetails = useCallback(async (returnId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/returns/${returnId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch return details");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReturn = useCallback(async (returnId: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update return request");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createReturn,
    getReturns,
    getReturnDetails,
    updateReturn,
    loading,
    error,
  };
};
