"use client";

import axios from "axios";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const InitializeCodPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/admin/migrations/initialize-cod");

      if (response.data.success) {
        setResult(response.data.stats);
        toast.success("✓ COD field initialization complete!");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to initialize COD fields";
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Initialize COD Fields
            </h1>
            <p className="text-gray-600 mb-4">
              This utility will initialize the COD (Cash on Delivery) settings
              for all existing product variants in your database.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              If you've set a COD charge but it shows as "Free" in the table,
              this migration should fix the issue by ensuring all variants have
              the COD field properly initialized.
            </p>

            <button
              onClick={handleInitialize}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Initialize COD Fields
                </>
              )}
            </button>

            {result && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✓ Migration Complete
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>
                    Total variants:{" "}
                    <span className="font-semibold">
                      {result.totalVariants}
                    </span>
                  </li>
                  <li>
                    Variants with COD field:{" "}
                    <span className="font-semibold">
                      {result.variantsWithCod}
                    </span>
                  </li>
                  <li>
                    Status:{" "}
                    <span className="font-semibold text-green-600">
                      {result.allInitialized
                        ? "✓ All initialized"
                        : "⚠ Some still missing"}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-3">What this does:</h3>
        <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
          <li>Finds all product variants without COD settings initialized</li>
          <li>
            Automatically adds the COD field with default values (Allowed: Yes,
            Charge: ₹0)
          </li>
          <li>No existing data is modified - only missing fields are added</li>
          <li>After this, you can set custom COD charges for each variant</li>
        </ul>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">After migration:</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Go to Admin → Groceries</li>
          <li>Click the "COD" button for any product</li>
          <li>Set the COD handling charge (e.g., ₹8)</li>
          <li>Click Save</li>
          <li>The table should now show the correct charge amount</li>
        </ol>
      </div>
    </div>
  );
};

export default InitializeCodPage;
