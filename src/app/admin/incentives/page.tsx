"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface IncentiveForm {
  title: string;
  description?: string;
  targetDeliveries?: number | "";
  targetEarnings?: number | "";
  rewardAmount: number | "";
  startAt: string;
  endAt: string;
  isActive: boolean;
}

interface Incentive {
  _id: string;
  title: string;
  description?: string;
  targetDeliveries?: number;
  targetEarnings?: number;
  rewardAmount: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
}

export default function AdminIncentivesPage() {
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<IncentiveForm>({
    title: "",
    description: "",
    targetDeliveries: "",
    targetEarnings: "",
    rewardAmount: "",
    startAt: "",
    endAt: "",
    isActive: true,
  });

  const fetchIncentives = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/incentives");
      const data = await res.json();
      if (data.success) setIncentives(data.incentives || []);
      else setError(data.message || "Unable to load incentives");
    } catch (err: any) {
      setError(err.message || "Unable to load incentives");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!form.title || !form.rewardAmount || !form.startAt || !form.endAt) {
      setError("Please fill title, reward, start, end.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/admin/incentives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetDeliveries: form.targetDeliveries || undefined,
          targetEarnings: form.targetEarnings || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create");
      setForm({
        title: "",
        description: "",
        targetDeliveries: "",
        targetEarnings: "",
        rewardAmount: "",
        startAt: "",
        endAt: "",
        isActive: true,
      });
      await fetchIncentives();
    } catch (err: any) {
      setError(err.message || "Unable to create");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/incentives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update");
      await fetchIncentives();
    } catch (err: any) {
      setError(err.message || "Unable to update");
    } finally {
      setLoading(false);
    }
  };

  const deleteIncentive = async (id: string) => {
    if (!confirm("Delete this incentive?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/incentives?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to delete");
      await fetchIncentives();
    } catch (err: any) {
      setError(err.message || "Unable to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery Incentives</h1>
          <p className="text-gray-600">
            Create and manage delivery partner incentives
          </p>
        </div>
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800 font-semibold"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-4">Create Incentive</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Reward Amount"
            type="number"
            value={form.rewardAmount}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                rewardAmount: Number(e.target.value) || "",
              }))
            }
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Target Deliveries"
            type="number"
            value={form.targetDeliveries}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                targetDeliveries: Number(e.target.value) || "",
              }))
            }
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Target Earnings"
            type="number"
            value={form.targetEarnings}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                targetEarnings: Number(e.target.value) || "",
              }))
            }
          />
          <input
            className="border rounded px-3 py-2"
            type="datetime-local"
            value={form.startAt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, startAt: e.target.value }))
            }
          />
          <input
            className="border rounded px-3 py-2"
            type="datetime-local"
            value={form.endAt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, endAt: e.target.value }))
            }
          />
          <input
            className="border rounded px-3 py-2 md:col-span-3"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Active
          </label>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            Create
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-4">All Incentives</h2>
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : incentives.length === 0 ? (
          <div className="text-gray-600">No incentives found</div>
        ) : (
          <div className="space-y-3">
            {incentives.map((inc) => (
              <div
                key={inc._id}
                className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">{inc.title}</p>
                  <p className="text-sm text-gray-500">
                    ₹{inc.rewardAmount} • {inc.isActive ? "Active" : "Inactive"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(inc.startAt).toLocaleString("en-IN")} →{" "}
                    {new Date(inc.endAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex gap-2 mt-3 md:mt-0">
                  <button
                    onClick={() => toggleActive(inc._id, !inc.isActive)}
                    className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    {inc.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteIncentive(inc._id)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
