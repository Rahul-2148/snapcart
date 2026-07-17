// src/components/location/LocationDetectionOverlay.tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, CheckCircle2, Locate } from "lucide-react";
import { useAppSelector } from "@/redux/store";

// ─── Radar Ring ──────────────────────────────────────────────────────────────
function RadarRing({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-full border-2 border-green-400/60"
      initial={{ scale: 0.6, opacity: 0.8 }}
      animate={{ scale: 2.8, opacity: 0 }}
      transition={{
        duration: 2.2,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// ─── Floating particle ───────────────────────────────────────────────────────
function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-green-400/70"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.4, 0],
        y: [0, -20, -40],
      }}
      transition={{
        duration: 2.4,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const PARTICLES = [
  { x: 20, y: 30, delay: 0.1 },
  { x: 75, y: 20, delay: 0.6 },
  { x: 85, y: 60, delay: 1.1 },
  { x: 15, y: 65, delay: 0.8 },
  { x: 50, y: 80, delay: 0.3 },
  { x: 40, y: 15, delay: 1.4 },
  { x: 60, y: 55, delay: 0.5 },
];

const LocationDetectionOverlay = () => {
  const showGpsOverlay = useAppSelector(
    (state) => state.location.showGpsOverlay,
  );
  const isDetecting = useAppSelector((state) => state.location.isDetecting);
  const fullAddress = useAppSelector((state) => state.location.fullAddress);
  const area = useAppSelector((state) => state.location.area);
  const city = useAppSelector((state) => state.location.city);

  // Phase: "detecting" | "found"
  const [phase, setPhase] = useState<"detecting" | "found">("detecting");

  // When detecting stops and we have an address → transition to "found"
  useEffect(() => {
    if (showGpsOverlay && !isDetecting && (fullAddress || city)) {
      setPhase("found");
    }
    if (!showGpsOverlay) {
      // Reset phase for next time (delayed so exit animation completes)
      const t = setTimeout(() => setPhase("detecting"), 600);
      return () => clearTimeout(t);
    }
  }, [showGpsOverlay, isDetecting, fullAddress, city]);

  const displayAddress = (() => {
    if (fullAddress) {
      // Shorten overly long addresses for display
      const parts = fullAddress.split(",");
      return parts.slice(0, 3).join(",").trim();
    }
    if (area && city) return `${area}, ${city}`;
    if (city) return city;
    return "Your Location";
  })();

  return (
    <AnimatePresence>
      {showGpsOverlay && (
        <motion.div
          key="gps-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, #052e16 0%, #021409 55%, #010b05 100%)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(34,197,94,0.12) 0%, transparent 70%)",
            }}
          />

          {/* Floating particles */}
          {PARTICLES.map((p, i) => (
            <Particle key={i} {...p} />
          ))}

          {/* ── Content card ── */}
          <div className="relative flex flex-col items-center gap-0 px-8 select-none">
            {/* SnapCart wordmark */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mb-10 flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                </svg>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                Snap<span className="text-green-400">Cart</span>
              </span>
            </motion.div>

            {/* Radar / Icon zone */}
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              {/* Radar rings — only during detecting */}
              <AnimatePresence>
                {phase === "detecting" && (
                  <>
                    <RadarRing delay={0} />
                    <RadarRing delay={0.75} />
                    <RadarRing delay={1.5} />
                  </>
                )}
              </AnimatePresence>

              {/* Central icon bubble */}
              <motion.div
                animate={
                  phase === "detecting"
                    ? {
                        scale: [1, 1.06, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(34,197,94,0.5)",
                          "0 0 24px 8px rgba(34,197,94,0.25)",
                          "0 0 0 0 rgba(34,197,94,0.5)",
                        ],
                      }
                    : {
                        scale: [1, 1.18, 1],
                        boxShadow: ["0 0 24px 8px rgba(34,197,94,0.35)"],
                      }
                }
                transition={
                  phase === "detecting"
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.4 }
                }
                className="relative w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center backdrop-blur-sm"
              >
                <AnimatePresence mode="wait">
                  {phase === "detecting" ? (
                    <motion.div
                      key="locating"
                      initial={{ opacity: 0, rotate: -10 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Locate className="w-9 h-9 text-green-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="found"
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    >
                      <CheckCircle2 className="w-9 h-9 text-green-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Text zone */}
            <AnimatePresence mode="wait">
              {phase === "detecting" ? (
                <motion.div
                  key="text-detecting"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <h2 className="text-white text-2xl font-bold tracking-tight">
                    Locating you…
                  </h2>
                  <p className="text-green-300/70 text-sm font-medium">
                    Finding your exact location via GPS
                  </p>

                  {/* Animated dots */}
                  <div className="flex gap-1.5 mt-3">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-green-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          delay: i * 0.22,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="text-found"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center gap-3 text-center max-w-xs"
                >
                  <h2 className="text-white text-2xl font-bold tracking-tight">
                    Location Found!
                  </h2>

                  {/* Address chip */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 280 }}
                    className="flex items-start gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 mt-1"
                  >
                    <MapPin className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/90 text-sm font-medium leading-snug text-left">
                      {displayAddress}
                    </span>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-green-300/60 text-xs"
                  >
                    Fetching nearby stores…
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-8 text-white/40 text-xs tracking-widest uppercase"
          >
            Delivery in minutes
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationDetectionOverlay;
