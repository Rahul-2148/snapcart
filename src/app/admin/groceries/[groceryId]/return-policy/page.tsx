// src/app/admin/groceries/[groceryId]/return-policy/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";

interface ReturnPolicy {
  _id?: string;
  grocery: string;
  isReturnable: boolean;
  returnWindowDays: number;
  policyType: "none" | "return-only" | "replacement-only" | "both";
  description?: string;
  isActive: boolean;
}

export default function ReturnPolicyPage() {
  const { groceryId } = useParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groceryName, setGroceryName] = useState<string>("");

  const [formData, setFormData] = useState<ReturnPolicy>({
    grocery: String(groceryId),
    isReturnable: false,
    returnWindowDays: 7,
    policyType: "none",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    fetchGroceryAndPolicy();
  }, [groceryId]);

  const fetchGroceryAndPolicy = async () => {
    setLoading(true);
    try {
      // Get grocery name (admin endpoint so we get the full payload shape)
      const groceryRes = await fetch(`/api/admin/groceries/${groceryId}`);
      if (groceryRes.ok) {
        const data = await groceryRes.json();
        const g = data.grocery || data.data || data; // handle different shapes
        if (g?.name) setGroceryName(g.name);
      }

      // Get existing policy (admin endpoint)
      let foundPolicy = false;
      const policyRes = await fetch(
        `/api/admin/return-policies?grocery=${groceryId}`,
      );
      if (policyRes.ok) {
        const data = await policyRes.json();
        const policies = Array.isArray(data) ? data : data.returnPolicies;
        if (policies && policies.length > 0) {
          foundPolicy = true;
          const p = policies[0];
          const derivedReturnable = (() => {
            if (typeof p.isReturnable === "boolean") return p.isReturnable;
            if (p.policyType && p.policyType !== "none") return true;
            return (p.returnWindowDays ?? 0) > 0;
          })();
          setFormData((prev) => ({
            ...prev,
            ...p,
            grocery: (p as any)?.grocery?._id || (p as any)?.grocery || String(groceryId),
            returnWindowDays: p.returnWindowDays ?? prev.returnWindowDays,
            isReturnable: derivedReturnable,
            policyType: (p.policyType as ReturnPolicy["policyType"]) ?? prev.policyType,
            description: p.description ?? prev.description,
            isActive: p.isActive ?? prev.isActive,
          }));
        }
      }

      // Fallback: if admin list didn't return a policy, try public policy endpoint
      if (!foundPolicy) {
        const fallbackRes = await fetch(`/api/returns/policy?groceryId=${groceryId}`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data?.hasPolicy) {
            const derivedReturnable = (() => {
              if (typeof data.isReturnable === "boolean") return data.isReturnable;
              if (data.policyType && data.policyType !== "none") return true;
              return (data.returnWindowDays ?? 0) > 0;
            })();
            setFormData((prev) => ({
              ...prev,
              grocery: String(groceryId),
              isReturnable: derivedReturnable,
              returnWindowDays: data.returnWindowDays ?? prev.returnWindowDays,
              policyType: (data.policyType as ReturnPolicy["policyType"]) ?? prev.policyType,
              description: data.description ?? prev.description,
              isActive: true,
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (formData._id) {
        // Update existing policy
        const response = await fetch(
          `/api/admin/return-policies/${formData._id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          },
        );

        if (response.ok) {
          enqueueSnackbar("Return policy updated successfully!", {
            variant: "success",
          });
          router.push("/admin/groceries");
        } else {
          const error = await response.json();
          enqueueSnackbar(error.error || "Failed to update policy", {
            variant: "error",
          });
        }
      } else {
        // Create new policy
        const response = await fetch("/api/admin/return-policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          enqueueSnackbar("Return policy created successfully!", {
            variant: "success",
          });
          const data = await response.json();
          setFormData(data.policy);
          router.push("/admin/groceries");
        } else {
          const error = await response.json();
          enqueueSnackbar(error.error || "Failed to create policy", {
            variant: "error",
          });
        }
      }
    } catch (error) {
      enqueueSnackbar("Error saving policy", { variant: "error" });
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-green-600 hover:text-green-700 mb-4 inline-flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Return Policy
            </h1>
            {groceryName && (
              <p className="text-lg text-gray-600">Product: {groceryName}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Enable/Disable Returns */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="text-lg font-semibold text-gray-900">
                    Allow Returns
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Can customers return this product?
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isReturnable}
                    onChange={(e) =>
                      handleChange("isReturnable", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {formData.isReturnable && (
                <>
                  {/* Return Window */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-lg font-semibold text-gray-900 mb-2">
                      Return Window (Days)
                    </label>
                    <p className="text-sm text-gray-600 mb-4">
                      How many days after delivery can customers return?
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {[3, 5, 7, 10, 14, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleChange("returnWindowDays", days)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            formData.returnWindowDays === days
                              ? "border-green-600 bg-green-50 font-semibold text-green-900"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Or enter custom days:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={formData.returnWindowDays}
                        onChange={(e) =>
                          handleChange(
                            "returnWindowDays",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Policy Type */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-lg font-semibold text-gray-900 mb-4">
                      What's Allowed?
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="policyType"
                          value="return-only"
                          checked={formData.policyType === "return-only"}
                          onChange={(e) =>
                            handleChange("policyType", e.target.value)
                          }
                          className="w-4 h-4 text-green-600"
                        />
                        <div className="ml-3">
                          <p className="font-semibold text-gray-900">
                            Return Only
                          </p>
                          <p className="text-sm text-gray-600">
                            Customer gets refund, no replacement option
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="policyType"
                          value="replacement-only"
                          checked={formData.policyType === "replacement-only"}
                          onChange={(e) =>
                            handleChange("policyType", e.target.value)
                          }
                          className="w-4 h-4 text-green-600"
                        />
                        <div className="ml-3">
                          <p className="font-semibold text-gray-900">
                            Replacement Only
                          </p>
                          <p className="text-sm text-gray-600">
                            Customer gets same/similar product, no refund
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center p-3 border border-green-200 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100">
                        <input
                          type="radio"
                          name="policyType"
                          value="both"
                          checked={formData.policyType === "both"}
                          onChange={(e) =>
                            handleChange("policyType", e.target.value)
                          }
                          className="w-4 h-4 text-green-600"
                        />
                        <div className="ml-3">
                          <p className="font-semibold text-gray-900">
                            Both Return & Replacement
                          </p>
                          <p className="text-sm text-gray-600">
                            Customer chooses: refund OR replacement
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-lg font-semibold text-gray-900 mb-2">
                      Policy Description (Optional)
                    </label>
                    <p className="text-sm text-gray-600 mb-4">
                      Add specific details about this product's return policy
                    </p>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      placeholder='e.g., "Fresh items must be returned within 24 hours. Damaged packaging not accepted."'
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {!formData.isReturnable && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-900 font-semibold">
                    ⚠️ Returns are disabled for this product
                  </p>
                  <p className="text-red-700 text-sm mt-2">
                    Customers will not be able to request returns or
                    replacements for this item.
                  </p>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
              <div className="space-y-2 text-sm">
                {formData.isReturnable ? (
                  <>
                    <p>
                      <span className="text-gray-600">Returns:</span>{" "}
                      <span className="font-semibold text-green-600">
                        ✓ Allowed
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Return Window:</span>{" "}
                      <span className="font-semibold">
                        {formData.returnWindowDays} days
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Options:</span>{" "}
                      <span className="font-semibold">
                        {formData.policyType === "both"
                          ? "Refund or Replacement"
                          : formData.policyType === "return-only"
                            ? "Refund Only"
                            : "Replacement Only"}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-red-600 font-semibold">
                    ✗ Returns Not Allowed
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Policy"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
