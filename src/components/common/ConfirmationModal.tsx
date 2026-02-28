// src/components/common/ConfirmationModal.tsx
"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export default function ConfirmationModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    open,
    close,
    Modal: (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm mx-4 p-6 animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                {isDangerous && (
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h2>
                </div>
              </div>

              {/* Message */}
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                {message}
              </p>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isDangerous
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isLoading ? "Processing..." : confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    ),
  };
}

// Hook to use the confirmation modal
export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmationModalProps | null>(null);

  const confirm = (options: ConfirmationModalProps) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...options,
        onConfirm: async () => {
          await options.onConfirm();
          resolve(true);
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
        },
      });
      setIsOpen(true);
    });
  };

  const handleConfirm = async () => {
    if (config) {
      const originalOnConfirm = config.onConfirm;
      await originalOnConfirm();
      setIsOpen(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmWithLoading = async () => {
    setIsLoading(true);
    try {
      await handleConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    config?.onCancel?.();
    setIsOpen(false);
  };

  return {
    confirm,
    Modal: isOpen && config && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-sm mx-4 p-6 animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {config.isDangerous && (
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {config.title}
              </h2>
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            {config.message}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {config.cancelText || "Cancel"}
            </button>
            <button
              onClick={handleConfirmWithLoading}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                config.isDangerous
                  ? "bg-red-600 hover:bg-red-700 disabled:bg-red-600"
                  : "bg-green-600 hover:bg-green-700 disabled:bg-green-600"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                config.confirmText || "Confirm"
              )}
            </button>
          </div>
        </div>
      </div>
    ),
  };
}
