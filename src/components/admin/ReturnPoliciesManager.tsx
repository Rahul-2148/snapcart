// src/components/admin/ReturnPoliciesManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface ReturnPolicy {
  _id: string;
  grocery: any;
  isReturnable: boolean;
  returnWindowDays: number;
  policyType: "none" | "return-only" | "replacement-only" | "both";
  description?: string;
  isActive: boolean;
}

interface ReturnPoliciesManagerProps {
  groceryId?: string;
}

export const ReturnPoliciesManager: React.FC<ReturnPoliciesManagerProps> = ({
  groceryId,
}) => {
  const [policies, setPolicies] = useState<ReturnPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    groceryId: groceryId || "",
    isReturnable: false,
    returnWindowDays: 7,
    policyType: "return-only" as const,
    description: "",
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/return-policies");
      const data = await response.json();
      setPolicies(data.returnPolicies || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.groceryId) {
      toast.error("Please select a grocery item");
      return;
    }

    try {
      const response = await fetch("/api/admin/return-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Return policy created successfully!");
        setFormData({
          groceryId: "",
          isReturnable: false,
          returnWindowDays: 7,
          policyType: "return-only",
          description: "",
        });
        setShowForm(false);
        fetchPolicies();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create policy");
      }
    } catch (error) {
      console.error("Error creating policy:", error);
      toast.error("Error creating policy");
    }
  };

  const handleUpdate = async (policyId: string, updates: any) => {
    try {
      const response = await fetch(`/api/admin/return-policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success("Policy updated successfully!");
        fetchPolicies();
      } else {
        toast.error("Failed to update policy");
      }
    } catch (error) {
      console.error("Error updating policy:", error);
      toast.error("Error updating policy");
    }
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      const response = await fetch(`/api/admin/return-policies/${policyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Policy deleted successfully!");
        fetchPolicies();
      } else {
        toast.error("Failed to delete policy");
      }
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast.error("Error deleting policy");
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Return Policies</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Policy"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border p-4 rounded bg-gray-50"
        >
          <div className="space-y-2">
            <label className="block font-medium">Grocery Item ID *</label>
            <input
              type="text"
              value={formData.groceryId}
              onChange={(e) =>
                setFormData({ ...formData, groceryId: e.target.value })
              }
              placeholder="Enter grocery ID"
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isReturnable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isReturnable: e.target.checked,
                    })
                  }
                />
                <span className="ml-2">Allow Returns</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block font-medium">Return Window (days)</label>
              <input
                type="number"
                min="0"
                max="365"
                value={formData.returnWindowDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    returnWindowDays: parseInt(e.target.value),
                  })
                }
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Policy Type</label>
            <select
              value={formData.policyType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  policyType: e.target.value as any,
                })
              }
              className="w-full p-2 border rounded"
            >
              <option value="return-only">Return Only (Refund)</option>
              <option value="replacement-only">Replacement Only</option>
              <option value="both">Both Return & Replacement</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Policy description (optional)"
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Create Policy
          </button>
        </form>
      )}

      {/* Policies List */}
      <div className="space-y-2">
        {policies.length === 0 ? (
          <div className="text-gray-600">No return policies found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Grocery</th>
                  <th className="border p-2 text-left">Type</th>
                  <th className="border p-2 text-left">Window</th>
                  <th className="border p-2 text-left">Active</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy._id} className="hover:bg-gray-50">
                    <td className="border p-2">{policy.grocery?.name}</td>
                    <td className="border p-2 capitalize">
                      {policy.policyType}
                    </td>
                    <td className="border p-2">
                      {policy.returnWindowDays} days
                    </td>
                    <td className="border p-2">
                      <input
                        type="checkbox"
                        checked={policy.isActive}
                        onChange={(e) =>
                          handleUpdate(policy._id, {
                            isActive: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="border p-2">
                      <button
                        onClick={() => handleDelete(policy._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
