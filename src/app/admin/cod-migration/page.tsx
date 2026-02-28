"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import axios from "axios";

export default function CleanupCodFieldsPage() {
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (
      !confirm(
        "This will remove per-product COD handling charges and keep only enable/disable flag. Proceed?",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "/api/admin/migrations/cleanup-cod-fields",
      );

      if (response.data.success) {
        toast.success(
          `✓ Migration complete!\nUpdated: ${response.data.variantsUpdated} variants\nEnsured isCodAllowed on: ${response.data.variantsEnsured} variants`,
        );
      }
    } catch (error: any) {
      console.error("Error running migration:", error);
      toast.error(error.response?.data?.error || "Failed to run migration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              COD Fields Migration
            </h1>
          </div>

          <p className="text-gray-600 mb-6">
            This migration will clean up the old per-product COD handling
            charges system.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-blue-900 mb-3">
              What this does:
            </h2>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>
                ✓ Removes{" "}
                <code className="bg-blue-100 px-2 py-1 rounded">
                  cod.handlingCharge
                </code>{" "}
                field from all variants
              </li>
              <li>
                ✓ Keeps only{" "}
                <code className="bg-blue-100 px-2 py-1 rounded">
                  cod.isCodAllowed
                </code>{" "}
                flag for enable/disable
              </li>
              <li>
                ✓ Ensures all variants have{" "}
                <code className="bg-blue-100 px-2 py-1 rounded">
                  isCodAllowed
                </code>{" "}
                set to true
              </li>
              <li>
                ✓ COD charges now managed globally via Admin → COD Settings
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-amber-900 mb-2">⚠️ Important:</h2>
            <p className="text-sm text-amber-800">
              After running this migration, make sure to set up your COD
              settings at <strong>Admin → COD Settings</strong> to define the
              flat charge amount.
            </p>
          </div>

          <button
            onClick={handleCleanup}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Migration...
              </>
            ) : (
              "Run Migration"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
