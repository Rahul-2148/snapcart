"use client";

import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";

interface PhotoUploadProps {
  assignmentId: string;
  onPhotoUploaded?: () => void;
}

export function PhotoUpload({
  assignmentId,
  onPhotoUploaded,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("photo", file);

      const res = await fetch("/api/delivery-boy/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Fetch updated photos
        const photosRes = await fetch(
          `/api/delivery-boy/upload-photo?assignmentId=${assignmentId}`,
        );
        const photosData = await photosRes.json();
        setPhotos(photosData.photos || []);
        onPhotoUploaded?.();
      } else {
        alert("Failed to upload photo");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading photo");
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    context.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );

    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `delivery-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        await handleFileSelect(file);
        setShowCamera(false);
        // Stop camera
        if (videoRef.current?.srcObject) {
          const tracks =
            (videoRef.current.srcObject as MediaStream)?.getTracks() || [];
          tracks.forEach((track) => track.stop());
        }
      }
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Delivery Photos
      </h3>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">
            Uploaded photos ({photos.length}):
          </p>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
              >
                <img
                  src={photo}
                  alt={`Delivery photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera View */}
      {showCamera ? (
        <div className="mb-6 space-y-3">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg border border-gray-200"
          />
          <canvas ref={canvasRef} width={640} height={480} className="hidden" />
          <div className="flex gap-3">
            <button
              onClick={handleCameraCapture}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {uploading ? "Uploading..." : "Take Photo"}
            </button>
            <button
              onClick={() => {
                setShowCamera(false);
                if (videoRef.current?.srcObject) {
                  const tracks =
                    (videoRef.current.srcObject as MediaStream)?.getTracks() ||
                    [];
                  tracks.forEach((track) => track.stop());
                }
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={startCamera}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 disabled:opacity-50 font-medium text-blue-600"
          >
            <Camera size={20} />
            Take Photo with Camera
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 font-medium text-gray-600"
          >
            Choose from Gallery
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
