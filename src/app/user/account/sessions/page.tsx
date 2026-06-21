"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  HelpCircle,
  Shield,
  ShieldAlert,
  Globe,
  Clock,
  Trash2,
  LogOut,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ISessionData {
  _id: string;
  userId: string;
  jti: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
  lastActiveAt: string;
}

export default function SessionsPage() {
  const { data: authSession } = useSession();
  const [sessions, setSessions] = useState<ISessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [revokingIds, setRevokingIds] = useState<string[]>([]);
  
  // Modals / Confirmation dialogues state
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async (showToast = false) => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/user/sessions");
      setSessions(response.data.sessions || []);
      setCurrentSessionId(response.data.currentSessionId || (authSession?.user as any)?.sessionId || null);
      if (showToast) {
        toast.success("Sessions list refreshed successfully!");
      }
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast.error(error.response?.data?.error || "Failed to load active sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSingle = async (sessionId: string) => {
    setRevokingIds((prev) => [...prev, sessionId]);
    const toastId = toast.loading("Terminating session...");
    try {
      const response = await axios.delete(`/api/user/sessions?sessionId=${sessionId}`);
      if (response.data.success) {
        setSessions((prev) => prev.filter((s) => s.jti !== sessionId));
        toast.success(response.data.message || "Session terminated successfully", { id: toastId });
      } else {
        toast.error(response.data.error || "Failed to terminate session", { id: toastId });
      }
    } catch (error: any) {
      console.error("Error revoking session:", error);
      toast.error(error.response?.data?.error || "Failed to terminate session", { id: toastId });
    } finally {
      setRevokingIds((prev) => prev.filter((id) => id !== sessionId));
      setConfirmRevokeId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setIsRevokingAll(true);
    const toastId = toast.loading("Terminating other sessions...");
    try {
      const response = await axios.delete("/api/user/sessions?revokeOthers=true");
      if (response.data.success) {
        // Keep only the current session
        setSessions((prev) => prev.filter((s) => s.jti === currentSessionId));
        toast.success(response.data.message || "All other sessions terminated", { id: toastId });
      } else {
        toast.error(response.data.error || "Failed to terminate other sessions", { id: toastId });
      }
    } catch (error: any) {
      console.error("Error revoking other sessions:", error);
      toast.error(error.response?.data?.error || "Failed to terminate other sessions", { id: toastId });
    } finally {
      setIsRevokingAll(false);
      setShowConfirmAllModal(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return <Laptop className="w-6 h-6 text-slate-600" />;
      case "mobile":
        return <Smartphone className="w-6 h-6 text-slate-600" />;
      case "tablet":
        return <Tablet className="w-6 h-6 text-slate-600" />;
      default:
        return <HelpCircle className="w-6 h-6 text-slate-600" />;
    }
  };

  // Helper to format last active relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Prevent negative difference due to system clock drift
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Active now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const thisDeviceSession = sessions.find((s) => s.jti === currentSessionId);
  const otherSessions = sessions.filter((s) => s.jti !== currentSessionId);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-0 pb-6 sm:px-6 relative">
      {/* Back link */}
      <Link
        href="/user/account"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft size={14} />
        Back to account
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-emerald-600" />
            Devices & Sessions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your active sessions across different devices and log out from anywhere.
          </p>
        </div>
        <button
          onClick={() => fetchSessions(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Account Security Information Alert */}
      <div className="mb-6 rounded-xl border border-slate-100 bg-gradient-to-r from-emerald-50/30 to-teal-50/30 p-4 flex gap-3 shadow-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-slate-800">Stateful Protection Active</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Snapcart secures your account using stateful session validation. Revoking a session immediately terminates authentication for that device, forcing an instant logout on its next request.
          </p>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <Monitor className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Active Sessions</p>
            <p className="text-xl font-bold text-slate-800">{isLoading ? "..." : sessions.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 rounded-lg">
            <Shield className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Security Rating</p>
            <p className="text-xl font-bold text-teal-700">Excellent</p>
          </div>
        </div>
      </div>

      {/* Bulk Revocation Area */}
      {!isLoading && otherSessions.length > 0 && (
        <div className="mb-8 rounded-xl border border-rose-100 bg-rose-50/30 p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Terminate other sessions</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Log out of all other active devices. You will remain logged in on this device.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmAllModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-sm font-bold text-white shadow-sm transition cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            Log Out Other Devices
          </button>
        </div>
      )}

      {/* Main Sessions Section */}
      <div className="space-y-6">
        {isLoading ? (
          // Skeletons
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">This Device</h2>
            <div className="h-24 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mt-6">Other Devices</h2>
            <div className="h-20 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
            <div className="h-20 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          </div>
        ) : (
          <>
            {/* This Device */}
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">This Device</h2>
              {thisDeviceSession ? (
                <div className="bg-emerald-50/40 border-2 border-emerald-500/30 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-8 -translate-y-8" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/10 shrink-0">
                        {getDeviceIcon(thisDeviceSession.deviceType)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-slate-800">
                            {thisDeviceSession.browser} on {thisDeviceSession.os}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Active Session
                          </span>
                        </div>
                        
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            IP Address: <span className="font-mono text-slate-700">{thisDeviceSession.ipAddress}</span>
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Started: {new Date(thisDeviceSession.createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          {thisDeviceSession.userAgent && (
                            <details className="text-[10px] text-slate-400 mt-2 cursor-pointer">
                              <summary className="hover:text-slate-600 focus:outline-none py-0.5">User-Agent details</summary>
                              <p className="mt-1 font-mono p-2 bg-slate-50 border border-slate-200 rounded leading-normal max-h-16 overflow-y-auto select-all">
                                {thisDeviceSession.userAgent}
                              </p>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm text-center">
                  <p className="text-sm font-semibold text-slate-600">Current device session information not found.</p>
                  <p className="text-xs text-slate-400 mt-1">This might happen if your local session ID isn't registered in the database yet.</p>
                </div>
              )}
            </div>

            {/* Other Devices */}
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Other Devices</h2>
              {otherSessions.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-sm text-center">
                  <div className="inline-flex p-3 bg-slate-50 rounded-full mb-3">
                    <Shield className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No other active devices</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    You are not logged in to Snapcart on any other device or browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {otherSessions.map((session) => (
                      <motion.div
                        key={session._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                        className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                              {getDeviceIcon(session.deviceType)}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800">
                                {session.browser} on {session.os}
                              </h3>
                              
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                                  IP Address: <span className="font-mono text-slate-700">{session.ipAddress}</span>
                                </p>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  Last active: {formatRelativeTime(session.lastActiveAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Individual revoke action */}
                          <div className="shrink-0">
                            {confirmRevokeId === session.jti ? (
                              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-600 px-1.5">Are you sure?</span>
                                <button
                                  onClick={() => handleRevokeSingle(session.jti)}
                                  disabled={revokingIds.includes(session.jti)}
                                  className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                                  title="Confirm Log Out"
                                >
                                  <Trash2 size={13} />
                                </button>
                                <button
                                  onClick={() => setConfirmRevokeId(null)}
                                  className="p-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                                  title="Cancel"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRevokeId(session.jti)}
                                disabled={revokingIds.includes(session.jti)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                Log Out
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Global Confirmation Modal for Revoking All Other Devices */}
      {showConfirmAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            onClick={() => setShowConfirmAllModal(false)}
          />
          <div className="relative bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-hidden">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 shrink-0 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Log out other devices?</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  This will instantly terminate all other active logged-in sessions for your account. You will remain active only on this device.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmAllModal(false)}
                    disabled={isRevokingAll}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeOthers}
                    disabled={isRevokingAll}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-sm font-bold text-white shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isRevokingAll ? "Terminating..." : "Yes, Log Out"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
