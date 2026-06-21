// src/components/verification/CameraCapture.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, Check, AlertCircle, Trash2, CameraOff } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClear: () => void;
  savedFileName?: string | null;
}

export default function CameraCapture({ onCapture, onClear, savedFileName }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time analysis states
  const [alignmentStatus, setAlignmentStatus] = useState<"offline" | "scanning" | "analyzing" | "aligned">("offline");
  const [feedbackMsg, setFeedbackMsg] = useState("Camera is offline");
  const [borderColorClass, setBorderColorClass] = useState("border-slate-700");
  const [stabilityProgress, setStabilityProgress] = useState(0);

  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const stabilityCounterRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const videoPlayingRef = useRef<boolean>(false);
  const warmupCounterRef = useRef<number>(25);
  const misalignmentFramesRef = useRef<number>(0);
  
  const historyRef = useRef<{
    centerX: number;
    centerY: number;
    skinCount: number;
    motion: number;
    centerSkinRatio: number;
    ratio1: number;
    ratio2: number;
  }[]>([]);

  // Helper to convert base64 image data to a File object
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const startCamera = async () => {
    setError(null);
    setIsCameraActive(true);
    setPreviewUrl(null);
    prevFrameRef.current = null;
    stabilityCounterRef.current = 0;
    setStabilityProgress(0);
    warmupCounterRef.current = 25; // Snappy warmup (~0.7s for auto-exposure)
    videoPlayingRef.current = false;
    misalignmentFramesRef.current = 0;
    historyRef.current = [];
    setAlignmentStatus("scanning");
    setFeedbackMsg("Initializing camera stream...");
    setBorderColorClass("border-slate-700");

    try {
      const constraints = {
        video: {
          facingMode: "user", // Prefer front camera
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access front camera. Please verify camera permissions or upload a file manually.");
      setIsCameraActive(false);
      setAlignmentStatus("offline");
      setFeedbackMsg("Camera access denied");
      setBorderColorClass("border-slate-700");
      toast.error("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    videoPlayingRef.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    stabilityCounterRef.current = 0;
    setStabilityProgress(0);
    misalignmentFramesRef.current = 0;
    historyRef.current = [];
    setAlignmentStatus("offline");
    setFeedbackMsg("Camera is offline");
    setBorderColorClass("border-slate-700");
  };

  const capturePhoto = () => {
    if (alignmentStatus !== "aligned") return;
    
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setPreviewUrl(dataUrl);
        stopCamera();

        const file = dataURLtoFile(dataUrl, `selfie_${Date.now()}.jpg`);
        onCapture(file);
        toast.success("Selfie captured successfully!");
      }
    }
  };

  const retakePhoto = () => {
    setPreviewUrl(null);
    onClear();
    startCamera();
  };

  const removePhoto = () => {
    setPreviewUrl(null);
    stopCamera();
    onClear();
  };

  // Real-time canvas scanner loop
  const analyzeFrame = () => {
    if (!isCameraActive || !videoPlayingRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      requestRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx || video.paused || video.ended) {
      requestRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    try {
      ctx.drawImage(video, 0, 0, 40, 40);
      const frame = ctx.getImageData(0, 0, 40, 40);
      const data = frame.data;

      // 1. Sensor Warmup check (prevent checking during webcam initialization flashes)
      if (warmupCounterRef.current > 0) {
        warmupCounterRef.current -= 1;
        setAlignmentStatus("scanning");
        setFeedbackMsg("📷 Calibrating camera sensor...");
        requestRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      let totalR = 0, totalG = 0, totalB = 0;
      let diffSum = 0;
      const prev = prevFrameRef.current;

      let skinCount = 0;
      let sumX = 0;
      let sumY = 0;

      // Track skin pixels in vertical bands inside the center zone (x: 14 to 26, y: 11 to 31)
      let band1Skin = 0; // y: 11 to 17 (Forehead/Eyes)
      let band2Skin = 0; // y: 18 to 24 (Cheeks/Nose)
      let band3Skin = 0; // y: 25 to 31 (Mouth/Chin)
      const bandTotal = (26 - 14 + 1) * 7; // 13 * 7 = 91 pixels

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        totalR += r;
        totalG += g;
        totalB += b;

        if (prev) {
          diffSum += Math.abs(r - prev[i]) + Math.abs(g - prev[i + 1]) + Math.abs(b - prev[i + 2]);
        }

        // Skin detection: Check standard RGB ranges and proportions for human skin tones
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isSkin = r > 45 && g > 30 && b > 20 && r > g && r > b && (max - min) > 12 && (r - g) > 10;

        if (isSkin) {
          skinCount++;
          const idxPixel = i / 4;
          const px = idxPixel % 40;
          const py = Math.floor(idxPixel / 40);
          sumX += px;
          sumY += py;

          // Count if pixel falls within the central vertical bands
          if (px >= 14 && px <= 26 && py >= 11 && py <= 31) {
            if (py <= 17) band1Skin++;
            else if (py <= 24) band2Skin++;
            else band3Skin++;
          }
        }
      }

      const pixelCount = data.length / 4;
      const avgR = totalR / pixelCount;
      const avgG = totalG / pixelCount;
      const avgB = totalB / pixelCount;
      const brightness = (avgR + avgG + avgB) / 3;

      prevFrameRef.current = new Uint8ClampedArray(data);
      const motion = prev ? diffSum / (pixelCount * 3) : 0;

      const rawCenterX = skinCount > 0 ? sumX / skinCount : 20;
      const rawCenterY = skinCount > 0 ? sumY / skinCount : 20;

      const ratio1 = band1Skin / bandTotal;
      const ratio2 = band2Skin / bandTotal;
      const ratio3 = band3Skin / bandTotal;
      const centerSkinCount = band1Skin + band2Skin + band3Skin;
      const centerTotalPixels = bandTotal * 3; // 273 pixels
      const centerSkinRatio = centerSkinCount / centerTotalPixels;

      // Add to history for smoothing (moving average)
      historyRef.current.push({
        centerX: rawCenterX,
        centerY: rawCenterY,
        skinCount: skinCount,
        motion: motion,
        centerSkinRatio: centerSkinRatio,
        ratio1: ratio1,
        ratio2: ratio2
      });

      if (historyRef.current.length > 6) {
        historyRef.current.shift();
      }

      const hist = historyRef.current;
      const len = hist.length;
      const avgCenterX = hist.reduce((sum, h) => sum + h.centerX, 0) / len;
      const avgCenterY = hist.reduce((sum, h) => sum + h.centerY, 0) / len;
      const avgSkinCount = hist.reduce((sum, h) => sum + h.skinCount, 0) / len;
      const avgMotion = hist.reduce((sum, h) => sum + h.motion, 0) / len;
      const avgCenterSkinRatio = hist.reduce((sum, h) => sum + h.centerSkinRatio, 0) / len;
      const avgRatio1 = hist.reduce((sum, h) => sum + h.ratio1, 0) / len;
      const avgRatio2 = hist.reduce((sum, h) => sum + h.ratio2, 0) / len;

      // Realtime positioning constraints (on a 40x40 canvas grid) using smoothed averages
      const isTooClose = avgSkinCount > 950;
      const isTooFar = avgSkinCount < 80 && avgSkinCount > 15;
      const isNoFace = avgSkinCount <= 15;
      const isCentered = avgCenterX >= 14 && avgCenterX <= 26 && avgCenterY >= 11 && avgCenterY <= 29;

      // Face texture/uniformity check (detects solid hand cover, neck, ceiling, or empty beige walls)
      // A real face contains high-contrast non-skin features like eyes/eyebrows/lips in the central box.
      // Thus, skin pixels ratio inside the center box should sit strictly between 25% and 88%.
      const isFaceTextureOk = avgCenterSkinRatio >= 0.25 && avgCenterSkinRatio <= 0.88;
      
      // Face geometry check: Cheeks/Nose (ratio2) must have high skin density and be significantly
      // higher than Eyes/Forehead (ratio1) due to dark eyes/eyebrows.
      // If they cover face or look up (showing solid neck), ratio2 and ratio1 are identical (difference < 0.06).
      const isGeometryOk = avgRatio2 >= 0.40 && (avgRatio2 - avgRatio1) >= 0.06;
      const isUniformCovered = (avgCenterSkinRatio > 0.88 || !isGeometryOk) && avgSkinCount > 100;

      let positionOk = false;
      let newFeedback = "";

      if (brightness < 30) {
        newFeedback = "⚠️ Environment too dark. Adjust lighting.";
      } else if (brightness > 245) {
        newFeedback = "⚠️ Environment too bright. Avoid glare.";
      } else if (isNoFace) {
        newFeedback = "🔍 Position face inside oval";
      } else if (isTooFar) {
        newFeedback = "🔍 Move closer to the camera";
      } else if (isTooClose) {
        newFeedback = "⚠️ Too close! Move slightly back";
      } else if (isUniformCovered) {
        newFeedback = "⚠️ Face covered or tilted. Look straight.";
      } else if (!isCentered) {
        if (avgCenterX < 14) {
          newFeedback = "👉 Center your face (move right)";
        } else if (avgCenterX > 26) {
          newFeedback = "👈 Center your face (move left)";
        } else if (avgCenterY < 11) {
          newFeedback = "👇 Position your face slightly lower";
        } else {
          newFeedback = "👆 Position your face slightly higher";
        }
      } else if (!isFaceTextureOk) {
        newFeedback = "🔍 Position face inside oval";
      } else {
        positionOk = true;
      }

      if (!positionOk) {
        // If we are currently in analyzing or aligned status, don't drop immediately. Give it an 8-frame grace period.
        if (alignmentStatus === "analyzing" || alignmentStatus === "aligned") {
          misalignmentFramesRef.current += 1;
          if (misalignmentFramesRef.current > 8) {
            setAlignmentStatus("scanning");
            setFeedbackMsg(newFeedback);
            setBorderColorClass("border-orange-500 shadow-orange-500/20");
            stabilityCounterRef.current = 0;
            setStabilityProgress(0); // Reset progress ring
            misalignmentFramesRef.current = 0;
          } else {
            // Pause countdown but keep requestAnimationFrame loop alive
            if (isCameraActive && videoPlayingRef.current) {
              requestRef.current = requestAnimationFrame(analyzeFrame);
            }
            return;
          }
        } else {
          setAlignmentStatus("scanning");
          setFeedbackMsg(newFeedback);
          setBorderColorClass("border-orange-500 shadow-orange-500/20");
          stabilityCounterRef.current = 0;
          setStabilityProgress(0);
          misalignmentFramesRef.current = 0;
        }
      } else {
        // Position is OK! Reset misalignment counter
        misalignmentFramesRef.current = 0;

        // Correctly positioned! Wait for user to hold still to pass liveness/stability check (snappy 18 frames ~0.5s)
        const targetStabilityFrames = 18;
        if (stabilityCounterRef.current === 0) {
          // Require a small micro-motion trigger (> 0.8) to prove it's a living face, not a static mockup
          if (avgMotion > 0.8) {
            stabilityCounterRef.current = 1;
            setStabilityProgress(5);
            setAlignmentStatus("analyzing");
            setFeedbackMsg("⚙️ Analyzing... Hold still");
            setBorderColorClass("border-amber-500 shadow-amber-500/25 animate-pulse");
          } else {
            setFeedbackMsg("🔍 Blink or nod to start verification...");
            setAlignmentStatus("scanning");
            setBorderColorClass("border-orange-500 shadow-orange-500/20");
            setStabilityProgress(0);
          }
        } else if (stabilityCounterRef.current > 0 && stabilityCounterRef.current < targetStabilityFrames) {
          setAlignmentStatus("analyzing");
          setBorderColorClass("border-amber-500 shadow-amber-500/25 animate-pulse");
          
          if (avgMotion > 8.5) {
            setFeedbackMsg("⚠️ Hold still...");
            stabilityCounterRef.current = Math.max(1, stabilityCounterRef.current - 4);
          } else {
            stabilityCounterRef.current += 1;
          }
          const pct = Math.round((stabilityCounterRef.current / targetStabilityFrames) * 100);
          setStabilityProgress(pct);
          setFeedbackMsg(`⚙️ Analyzing... (${pct}%)`);
        } else {
          // Success! User is aligned and stable
          setAlignmentStatus("aligned");
          setFeedbackMsg("✓ Face aligned! Stand still & capture.");
          setBorderColorClass("border-emerald-500 shadow-emerald-500/35");
          setStabilityProgress(100);

          // CONTINUOUS REALTIME CHECK: If they start moving drastically, force stability reset
          if (avgMotion > 13.0) {
            stabilityCounterRef.current = 6; // penalize and drop back to analyzing
            setStabilityProgress(Math.round((6 / targetStabilityFrames) * 100));
            setAlignmentStatus("analyzing");
          }
        }
      }
    } catch (e) {
      console.error("Frame analysis error:", e);
    }

    if (isCameraActive && videoPlayingRef.current) {
      requestRef.current = requestAnimationFrame(analyzeFrame);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [stream]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4 relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0.1; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { top: 100%; opacity: 0.1; }
        }
        .animate-scan-line {
          animation: scan 2.2s ease-in-out infinite;
        }
      `}} />

      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Selfie Verification Camera
      </h4>

      <div className={`relative w-48 h-48 rounded-full border overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner transition-all duration-500 ${
        alignmentStatus === "aligned" ? "border-emerald-500/20 shadow-emerald-500/20" :
        alignmentStatus === "analyzing" ? "border-amber-500/10" :
        alignmentStatus === "scanning" ? "border-orange-500/10" : "border-slate-800"
      }`}>
        {isCameraActive && !previewUrl ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlay={() => {
                videoPlayingRef.current = true;
                if (requestRef.current) {
                  cancelAnimationFrame(requestRef.current);
                }
                requestRef.current = requestAnimationFrame(analyzeFrame);
              }}
              className="w-full h-full object-cover scale-x-[-1]"
            />
            
            {/* SVG Circular Progress Loader */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                className="stroke-slate-800/40"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                className={`transition-all duration-150 ease-out ${
                  alignmentStatus === "scanning" ? "stroke-orange-500/50" :
                  alignmentStatus === "analyzing" ? "stroke-amber-500" :
                  alignmentStatus === "aligned" ? "stroke-emerald-500" : "stroke-slate-700"
                }`}
                strokeWidth="3"
                strokeDasharray="289"
                strokeDashoffset={
                  alignmentStatus === "aligned" ? 0 :
                  alignmentStatus === "analyzing" ? 289 - (stabilityProgress / 100) * 289 :
                  alignmentStatus === "scanning" ? 289 : 289
                }
                style={{
                  filter: alignmentStatus === "aligned" ? "drop-shadow(0 0 4px rgba(16,185,129,0.5))" : "none"
                }}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner dashed face alignment guide oval */}
            <div className={`absolute inset-5 rounded-full border border-dashed transition-all duration-500 pointer-events-none ${
              alignmentStatus === "scanning" ? "border-orange-500/30 scale-100 animate-pulse" :
              alignmentStatus === "analyzing" ? "border-amber-500/50 scale-102" : "border-emerald-500/80 scale-98"
            }`} />

            {(alignmentStatus === "scanning" || alignmentStatus === "analyzing") && (
              <div className={`absolute left-0 right-0 h-0.5 animate-scan-line ${
                alignmentStatus === "scanning" 
                  ? "bg-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.6)]" 
                  : "bg-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              }`} />
            )}
          </>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Captured Selfie"
            className="w-full h-full object-cover animate-fade-in"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-3">
            <CameraOff className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-[10px] text-slate-500 font-medium">Camera is offline</p>
          </div>
        )}
      </div>

      {/* Floating Pill Banner feedback indicator */}
      <div className={`px-4 py-1.5 rounded-full border text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 flex items-center gap-1.5 ${
        alignmentStatus === "scanning" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
        alignmentStatus === "analyzing" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
        alignmentStatus === "aligned" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)] animate-pulse" :
        "bg-slate-900/60 border-slate-800 text-slate-500"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          alignmentStatus === "scanning" ? "bg-orange-500 animate-ping" :
          alignmentStatus === "analyzing" ? "bg-amber-500 animate-pulse" :
          alignmentStatus === "aligned" ? "bg-emerald-500" : "bg-slate-600"
        }`} />
        {feedbackMsg}
      </div>

      {savedFileName && !isCameraActive && (
        <span className="text-xs text-green-400 font-bold bg-green-950/40 border border-green-500/20 px-3 py-1 rounded-xl flex items-center gap-1.5 animate-fade-in">
          <Check className="w-3.5 h-3.5" /> Selected: {savedFileName.length > 20 ? savedFileName.slice(0, 20) + "..." : savedFileName}
        </span>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-xs w-full max-w-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center pt-2">
        {!isCameraActive && !previewUrl && (
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer animate-fade-in"
          >
            <Camera className="w-4 h-4" /> Start Camera
          </button>
        )}

        {isCameraActive && (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={alignmentStatus !== "aligned"}
              className={`flex items-center gap-1.5 px-4 py-2 ${
                alignmentStatus === "aligned" 
                  ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-lg shadow-emerald-500/10 scale-102 font-bold" 
                  : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border border-slate-700/50"
              } text-white rounded-xl text-xs font-bold transition-all duration-300`}
            >
              📸 Capture Selfie
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Turn Off
            </button>
          </>
        )}

        {previewUrl && (
          <>
            <button
              type="button"
              onClick={retakePhoto}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
            </button>
            <button
              type="button"
              onClick={removePhoto}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
