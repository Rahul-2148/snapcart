// src/components/ReturnRequestForm.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useReturns } from "@/hooks/useReturns";
import { RETURN_REASONS } from "@/lib/client/returnPolicies";

interface ReturnRequestFormProps {
  orderId: string;
  orderItemId: string;
  groceryName: string;
  allowedRequestTypes: ("return" | "replacement")[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ReturnRequestForm: React.FC<ReturnRequestFormProps> = ({
  orderId,
  orderItemId,
  groceryName,
  allowedRequestTypes,
  onSuccess,
  onCancel,
}) => {
  const { createReturn, loading, error } = useReturns();
  const [requestType, setRequestType] = useState<"return" | "replacement">(
    (allowedRequestTypes[0] as "return" | "replacement") || "return",
  );
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    try {
      setUploading(true);
      
      // Upload images to Cloudinary if any
      const uploadedImages: Array<{ url: string; publicId: string }> = [];
      
      if (images.length > 0) {
        for (const image of images) {
          const formData = new FormData();
          formData.append("file", image);
          
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            uploadedImages.push({
              url: uploadData.url,
              publicId: uploadData.publicId,
            });
          }
        }
      }
      
      setUploading(false);

      await createReturn({
        orderId,
        orderItemId,
        requestType,
        reason,
        description,
        images: uploadedImages,
      });

      toast.success("Return request submitted successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Error submitting return:", err);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">
        Request Return for {groceryName}
      </h3>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Request Type Selection */}
      <div className="space-y-2">
        <label className="block font-medium">What would you like to do?</label>
        <div className="flex gap-4">
          {allowedRequestTypes.includes("return") && (
            <label className="flex items-center">
              <input
                type="radio"
                value="return"
                checked={requestType === "return"}
                onChange={(e) => setRequestType(e.target.value as "return")}
              />
              <span className="ml-2">Return & Refund</span>
            </label>
          )}
          {allowedRequestTypes.includes("replacement") && (
            <label className="flex items-center">
              <input
                type="radio"
                value="replacement"
                checked={requestType === "replacement"}
                onChange={(e) =>
                  setRequestType(e.target.value as "replacement")
                }
              />
              <span className="ml-2">Get Replacement</span>
            </label>
          )}
        </div>
      </div>

      {/* Reason Selection */}
      <div className="space-y-2">
        <label htmlFor="reason" className="block font-medium">
          Reason for Return *
        </label>
        <select
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select a reason</option>
          {RETURN_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block font-medium">
          Additional Details
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us more about the issue..."
          rows={3}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <label htmlFor="images" className="block font-medium">
          Upload Photos (Optional)
        </label>
        <p className="text-xs text-gray-600 mb-1">
          Upload photos showing the issue (damage, defect, wrong item, etc.)
        </p>
        <input
          id="images"
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          className="w-full"
        />
        {images.length > 0 && (
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">{images.length} image(s) selected:</p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading images..." : loading ? "Submitting..." : "Submit Return Request"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border py-2 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
