// src/components/ReturnsList.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useReturns } from "@/hooks/useReturns";
import { RETURN_STATUSES } from "@/lib/client/returnPolicies";

interface ReturnsListProps {
  status?: string;
}

export const ReturnsList: React.FC<ReturnsListProps> = ({ status }) => {
  const { getReturns, loading, error } = useReturns();
  const [returns, setReturns] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        const data = await getReturns(status, page);
        setReturns(data.returnRequests);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Error fetching returns:", err);
      }
    };

    fetchReturns();
  }, [status, page, getReturns]);

  const getStatusColor = (stat: string) => {
    const statusObj = RETURN_STATUSES.find((s) => s.value === stat);
    return statusObj?.color || "gray";
  };

  const getStatusLabel = (stat: string) => {
    const statusObj = RETURN_STATUSES.find((s) => s.value === stat);
    return statusObj?.label || stat;
  };

  if (loading) return <div className="p-4">Loading returns...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  if (returns.length === 0) {
    return <div className="p-4 text-gray-600">No return requests found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Product</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Reason</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Requested</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => (
              <tr key={ret._id} className="hover:bg-gray-50">
                <td className="border p-2">{ret.grocery?.name}</td>
                <td className="border p-2 capitalize">{ret.requestType}</td>
                <td className="border p-2 capitalize">{ret.reason}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-sm bg-${getStatusColor(
                      ret.status,
                    )}-100 text-${getStatusColor(ret.status)}-800`}
                  >
                    {getStatusLabel(ret.status)}
                  </span>
                </td>
                <td className="border p-2">
                  {new Date(ret.requestedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.pages, page + 1))}
            disabled={page === pagination.pages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
