"use client";

import axios from "axios";
import {
  ArrowDown,
  Bot,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Pin,
  PinOff,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { RootState } from "@/redux/store";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatSessionOption = {
  id: string;
  title: string;
  pinned?: boolean;
  updatedAt: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

const roleLabelMap: Record<string, string> = {
  guest: "Guest",
  user: "User",
  deliveryBoy: "Delivery Partner",
  admin: "Admin",
};

const initialGreeting: Message = {
  role: "assistant",
  content:
    "Namaste! Main Snapcart AI Assistant hoon. Aap orders, returns, delivery workflow, admin operations ya app usage related kuch bhi pooch sakte ho.",
};

const getShortDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getChatbotTypingLabel = (
  question: string,
  role: string,
  hasProductContext: boolean,
) => {
  const text = question.toLowerCase();

  if (hasProductContext) {
    if (/(variant|size|pack|kg|gm|ml)/.test(text)) {
      return "Reviewing product variants...";
    }
    if (/(compare|alternative|better|best)/.test(text)) {
      return "Comparing product options...";
    }
    return "Analyzing this product...";
  }

  if (role === "admin") {
    if (/(banner|hero|slider|cta)/.test(text)) {
      return "Checking banner insights...";
    }
    return "Compiling admin insights...";
  }

  if (role === "deliveryBoy") {
    if (/(route|eta|delay)/.test(text)) {
      return "Mapping delivery plan...";
    }
    return "Checking delivery operations...";
  }

  if (/(order|track|eta|delivery)/.test(text)) {
    return "Checking your order updates...";
  }

  if (/(return|refund|replace)/.test(text)) {
    return "Reviewing return & refund details...";
  }

  return "AI is typing...";
};

type SnapcartAIChatbotProps = {
  showLauncher?: boolean;
};

type ChatbotProductContext = {
  productId: string;
  name: string;
  brand?: string;
  categoryName?: string;
  description?: string;
  variantLabel?: string;
  sellingPrice?: number;
  mrpPrice?: number;
  stock?: number;
};

const isLikelyMobileDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  return (
    /Android|iPhone|iPad|iPod|Mobi/i.test(userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent))
  );
};

export default function SnapcartAIChatbot({
  showLauncher = true,
}: SnapcartAIChatbotProps) {
  const cloudTtsEnabled = process.env.NEXT_PUBLIC_ENABLE_NEURAL_TTS === "true";
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [sessionOptions, setSessionOptions] = useState<ChatSessionOption[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [searchingSessions, setSearchingSessions] = useState(false);
  const [sessionSearchError, setSessionSearchError] = useState<string | null>(
    null,
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [suggestionFeedbackLoading, setSuggestionFeedbackLoading] =
    useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPulseActive, setUnreadPulseActive] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechMode, setSpeechMode] = useState<"none" | "cloud" | "browser">(
    "none",
  );
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [productContext, setProductContext] =
    useState<ChatbotProductContext | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioUrlRef = useRef<string | null>(null);
  const speechPlaybackTokenRef = useRef(0);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const sessionSearchInputRef = useRef<HTMLInputElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollEnabledRef = useRef(true);
  const lastAssistantSnapshotRef = useRef("");
  const latestSessionsRequestRef = useRef(0);
  const hasUnreadIndicator = unreadCount > 0;

  const { data: session } = useSession();
  const pathname = usePathname();
  const { userData } = useSelector((state: RootState) => state.user);
  const isProductDetailsPage = pathname?.includes("/product-details/");

  const role = useMemo(() => {
    const sessionUser = session?.user as Session["user"] | undefined;
    const currentRole =
      userData?.currentRole || sessionUser?.currentRole || "guest";
    return currentRole;
  }, [session?.user, userData?.currentRole]);

  useEffect(() => {
    setSuggestions([]);
  }, [role]);

  useEffect(() => {
    if (!pathname?.startsWith("/user/product-details/")) {
      setProductContext(null);
    }
  }, [pathname]);

  const fetchSessions = useCallback(
    async (query?: string) => {
      if (!session?.user?.id) {
        return;
      }

      const requestId = latestSessionsRequestRef.current + 1;
      latestSessionsRequestRef.current = requestId;
      setSearchingSessions(true);
      setSessionSearchError(null);

      const trimmedQuery = query?.trim();
      const endpoint = trimmedQuery
        ? `/api/chatbot/sessions?q=${encodeURIComponent(trimmedQuery)}`
        : "/api/chatbot/sessions";

      try {
        const sessionsResponse = await axios.get(endpoint);
        if (requestId !== latestSessionsRequestRef.current) {
          return;
        }

        if (
          sessionsResponse.data?.success &&
          Array.isArray(sessionsResponse.data?.sessions)
        ) {
          setSessionOptions(sessionsResponse.data.sessions);
          return;
        }

        setSessionSearchError("Search response invalid aaya, please retry.");
      } catch {
        if (requestId === latestSessionsRequestRef.current) {
          setSessionSearchError(
            "Search temporarily unavailable. Please retry.",
          );
        }
      } finally {
        if (requestId === latestSessionsRequestRef.current) {
          setSearchingSessions(false);
        }
      }
    },
    [session?.user?.id],
  );

  const activeSession = useMemo(
    () => sessionOptions.find((item) => item.id === sessionId) || null,
    [sessionId, sessionOptions],
  );

  const renderHighlightedText = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return text;
    }

    const parts = text.split(new RegExp(`(${escapeRegex(trimmed)})`, "ig"));
    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === trimmed.toLowerCase();
      return isMatch ? (
        <span
          key={`${part}-${index}`}
          className="bg-yellow-100 text-gray-900 rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      );
    });
  };

  const editingSessionMeta = useMemo(
    () => sessionOptions.find((item) => item.id === editingSessionId) || null,
    [editingSessionId, sessionOptions],
  );

  useEffect(() => {
    const initHistory = async () => {
      if (session?.user?.id) {
        try {
          await fetchSessions();

          const response = await axios.get("/api/chatbot/history");
          if (
            response.data?.success &&
            response.data?.session?.messages?.length
          ) {
            setMessages(response.data.session.messages);
            setSessionId(response.data.session.id || null);
          }
        } catch {
          setMessages([initialGreeting]);
        }
        return;
      }

      const local = localStorage.getItem("snapcart_chat_history");
      if (local) {
        try {
          const parsed = JSON.parse(local) as Message[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch {
          setMessages([initialGreeting]);
        }
      }
    };

    initHistory();
  }, [fetchSessions, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSessions(sessionSearch).catch(() => undefined);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [fetchSessions, session?.user?.id, sessionSearch]);

  useEffect(() => {
    if (!editingSessionId) {
      return;
    }
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [editingSessionId]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (speechAudioRef.current) {
        speechAudioRef.current.pause();
        speechAudioRef.current = null;
      }

      if (speechAudioUrlRef.current) {
        URL.revokeObjectURL(speechAudioUrlRef.current);
        speechAudioUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (speechMode === "cloud" && speechAudioRef.current) {
      speechAudioRef.current.playbackRate = speechRate;
    }
  }, [speechMode, speechRate]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    const refreshVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    refreshVoices();
    synth.addEventListener("voiceschanged", refreshVoices);

    return () => {
      synth.removeEventListener("voiceschanged", refreshVoices);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      setIsPanelMounted(true);
      requestAnimationFrame(() => {
        setIsPanelVisible(true);
      });
    } else {
      setIsPanelVisible(false);
      if (isPanelMounted) {
        timer = setTimeout(() => {
          setIsPanelMounted(false);
        }, 200);
      }
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isOpen, isPanelMounted]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        if (editingSessionId) {
          setEditingSessionId(null);
          setEditingTitle("");
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          return;
        }
        setIsOpen(false);
        return;
      }

      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
      ) {
        return;
      }

      if (!isOpen || !session?.user?.id) {
        return;
      }

      event.preventDefault();
      sessionSearchInputRef.current?.focus();
      sessionSearchInputRef.current?.select();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingSessionId, isFullscreen, isOpen, session?.user?.id]);

  useEffect(() => {
    const handleExternalOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{
        prefill?: string;
        productContext?: ChatbotProductContext;
      }>;

      const prefill = customEvent.detail?.prefill?.trim();
      if (prefill) {
        setInput(prefill);
      }

      if (customEvent.detail?.productContext) {
        setProductContext(customEvent.detail.productContext);
      }

      setIsOpen(true);
    };

    window.addEventListener("snapcart-ai-open", handleExternalOpen);
    return () =>
      window.removeEventListener("snapcart-ai-open", handleExternalOpen);
  }, []);

  const closeChatbot = () => {
    setIsFullscreen(false);
    setIsOpen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  useEffect(() => {
    if (!session?.user?.id) {
      localStorage.setItem(
        "snapcart_chat_history",
        JSON.stringify(messages.slice(-20)),
      );
    }
  }, [messages, session?.user?.id]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      autoScrollEnabledRef.current = distanceFromBottom < 120;
      if (autoScrollEnabledRef.current) {
        setUnreadCount(0);
      }
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen, isFullscreen]);

  useEffect(() => {
    if (!isOpen || !autoScrollEnabledRef.current) {
      return;
    }

    const container = messagesScrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: loading ? "auto" : "smooth",
    });
  }, [isOpen, loading, messages]);

  useEffect(() => {
    if (
      !isOpen ||
      autoScrollEnabledRef.current ||
      messages.length === 0 ||
      loading
    ) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") {
      return;
    }

    const snapshot = `${messages.length}:${lastMessage.content}`;
    if (snapshot === lastAssistantSnapshotRef.current) {
      return;
    }

    lastAssistantSnapshotRef.current = snapshot;
    setUnreadCount((prev) => prev + 1);
  }, [isOpen, loading, messages]);

  useEffect(() => {
    if (unreadCount <= 0) {
      setUnreadPulseActive(false);
      return;
    }

    setUnreadPulseActive(true);
    const timer = setTimeout(() => setUnreadPulseActive(false), 1800);
    return () => clearTimeout(timer);
  }, [unreadCount]);

  const jumpToLatest = () => {
    const container = messagesScrollRef.current;
    if (!container) {
      return;
    }

    autoScrollEnabledRef.current = true;
    setUnreadCount(0);
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  };

  const pickPreferredVoice = (content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices =
      availableVoices.length > 0
        ? availableVoices
        : window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }

    const lower = content.toLowerCase();
    const hasHindiHint =
      /[\u0900-\u097F]/.test(content) ||
      /(kya|kaise|hai|mera|mere|aap|nahi|batao|samjhao|kr|kar|delivery|order|returns|admin)/.test(
        lower,
      );
    const isDesktop = !isLikelyMobileDevice();
    const preferredFallbackLang = hasHindiHint ? "hi-IN" : "en-IN";

    const scoreVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      const lang = (voice.lang || "").toLowerCase();
      let score = 0;

      if (hasHindiHint) {
        if (lang.startsWith("hi-in")) score += 120;
        else if (lang.startsWith("hi")) score += 110;
        else if (lang.startsWith("en-in")) score += 85;
        else if (lang.startsWith("en-gb") || lang.startsWith("en-us")) score -= 12;
      } else {
        if (lang.startsWith("en-in")) score += 120;
        else if (lang.startsWith("hi-in")) score += 100;
        else if (lang.startsWith("hi")) score += 90;
        else if (lang.startsWith("en-gb") || lang.startsWith("en-us")) score -= 8;
      }

      if (name.includes("google")) score += 25;
      if (name.includes("microsoft")) score += 22;
      if (
        name.includes("natural") ||
        name.includes("neural") ||
        name.includes("wavenet")
      )
        score += 18;
      if (
        name.includes("india") ||
        name.includes("hindi") ||
        name.includes("indian")
      )
        score += 16;

      if (
        name.includes("female") ||
        name.includes("woman") ||
        name.includes("girl") ||
        name.includes("swara") ||
        name.includes("aditi") ||
        name.includes("priya") ||
        name.includes("raveena") ||
        name.includes("sangeeta") ||
        name.includes("salli") ||
        name.includes("zira") ||
        name.includes("vaani") ||
        name.includes("heera") ||
        name.includes("neerja") ||
        name.includes("neeraj") ||
        name.includes("meera") ||
        name.includes("kavya") ||
        name.includes("isha") ||
        name.includes("anjali") ||
        name.includes("suhani") ||
        name.includes("rashi") ||
        name.includes("shreya") ||
        name.includes("tessa") ||
        name.includes("aria") ||
        name.includes("samantha") ||
        name.includes("neural")
      ) {
        score += isDesktop ? 60 : 36;
      }

      if (
        name.includes("david") ||
        name.includes("male") ||
        name.includes("man") ||
        name.includes("alex") ||
        name.includes("daniel") ||
        name.includes("harry") ||
        name.includes("mike")
      ) {
        score -= isDesktop ? 18 : 6;
      }

      if (voice.localService) {
        score += 4;
      }

      return score;
    };

    const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return ranked[0] || null;
  };

  const normalizeTextForSpeech = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*|__/g, "")
      .replace(/[•●▪]/g, ". ")
      .replace(/\bMRP\b/gi, "maximum retail price")
      .replace(/\bSKU\b/gi, "stock keeping unit")
      .replace(/\bGST\b/gi, "goods and services tax")
      .replace(/\bFSSAI\b/gi, "food safety and standards authority of India")
      .replace(/\bCOD\b/gi, "cash on delivery")
      .replace(/\bFAQ\b/gi, "frequently asked questions")
      .replace(/\bAI\b/gi, "artificial intelligence")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .replace(/\bETA\b/gi, "estimated time")
      .replace(/₹\s?(\d+)/g, "$1 rupees")
      .replace(/(\d+)\s?(kg|kilograms?)\b/gi, "$1 kilogram")
      .replace(/(\d+)\s?(g|gm|grams?)\b/gi, "$1 gram")
      .replace(/(\d+)\s?(ml|milliliters?)\b/gi, "$1 milliliter")
      .replace(/(\d+)\s?(l|ltr|liter|litre|liters|litres)\b/gi, "$1 liter")
      .replace(/\bkg\b/gi, "kilogram")
      .replace(/\bgm\b/gi, "gram")
      .replace(/\bg\b/gi, "gram")
      .replace(/\bml\b/gi, "milliliter")
      .replace(/\bltr\b/gi, "liter")
      .replace(/\blitre\b/gi, "liter")
      .replace(/\bliter\b/gi, "liter")
      .replace(/\blitres\b/gi, "liter")
      .replace(/\s*\/\s*/g, " or ")
      .replace(/&/g, " and ")
      .trim();
  };

  const splitSpeechChunks = (text: string, maxChunkLength = 220) => {
    const sentenceParts = text
      .split(/(?<=[.!?।])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (sentenceParts.length === 0) {
      return [] as string[];
    }

    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentenceParts) {
      if (!current) {
        current = sentence;
        continue;
      }

      const candidate = `${current} ${sentence}`;
      if (candidate.length <= maxChunkLength) {
        current = candidate;
      } else {
        chunks.push(current);
        current = sentence;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  };

  const stopCurrentSpeechPlayback = () => {
    speechPlaybackTokenRef.current += 1;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current = null;
    }

    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current);
      speechAudioUrlRef.current = null;
    }

    setSpeechMode("none");
  };

  const playBrowserSpeech = (messageId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const normalized = normalizeTextForSpeech(text);
    const chunks = splitSpeechChunks(normalized);
    if (chunks.length === 0) {
      return;
    }

    const playbackToken = ++speechPlaybackTokenRef.current;
    const preferredVoice = pickPreferredVoice(normalized);

    setSpeakingMessageId(messageId);
    setIsSpeechPaused(false);
    setSpeechMode("browser");

    const speakChunk = (chunkIndex: number) => {
      if (playbackToken !== speechPlaybackTokenRef.current) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = preferredFallbackLang;
      }

      utterance.rate = isLikelyMobileDevice() ? speechRate * 0.96 : speechRate * 0.9;
      utterance.pitch = isLikelyMobileDevice() ? 1.08 : 1.22;
      utterance.volume = 1;

      utterance.onend = () => {
        if (playbackToken !== speechPlaybackTokenRef.current) {
          return;
        }

        if (chunkIndex < chunks.length - 1) {
          speakChunk(chunkIndex + 1);
          return;
        }

        setSpeakingMessageId(null);
        setIsSpeechPaused(false);
        setSpeechMode("none");
        speechUtteranceRef.current = null;
      };

      utterance.onerror = () => {
        if (playbackToken !== speechPlaybackTokenRef.current) {
          return;
        }

        setSpeakingMessageId(null);
        setIsSpeechPaused(false);
        setSpeechMode("none");
        speechUtteranceRef.current = null;
        setToast({
          type: "error",
          message: "Unable to play this response as audio",
        });
      };

      speechUtteranceRef.current = utterance;
      synth.speak(utterance);
    };

    speakChunk(0);
  };

  const playCloudSpeech = async (messageId: string, text: string) => {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
    });

    if (!response.ok) {
      throw new Error("Cloud TTS unavailable");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    audio.playbackRate = speechRate;

    speechAudioRef.current = audio;
    speechAudioUrlRef.current = objectUrl;
    setSpeechMode("cloud");
    setSpeakingMessageId(messageId);
    setIsSpeechPaused(false);

    audio.onended = () => {
      setSpeakingMessageId(null);
      setIsSpeechPaused(false);
      setSpeechMode("none");
      if (speechAudioUrlRef.current) {
        URL.revokeObjectURL(speechAudioUrlRef.current);
        speechAudioUrlRef.current = null;
      }
      speechAudioRef.current = null;
    };

    audio.onerror = () => {
      setSpeakingMessageId(null);
      setIsSpeechPaused(false);
      setSpeechMode("none");
      if (speechAudioUrlRef.current) {
        URL.revokeObjectURL(speechAudioUrlRef.current);
        speechAudioUrlRef.current = null;
      }
      speechAudioRef.current = null;
      setToast({
        type: "error",
        message: "Unable to play this response as audio",
      });
    };

    await audio.play();
  };

  const toggleSpeechForMessage = async (messageId: string, content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setToast({
        type: "error",
        message: "Audio playback is not supported in this browser",
      });
      return;
    }

    const synth = window.speechSynthesis;
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const isSameMessage = speakingMessageId === messageId;

    if (isSameMessage && speechMode === "cloud" && speechAudioRef.current) {
      if (speechAudioRef.current.paused) {
        try {
          await speechAudioRef.current.play();
          setIsSpeechPaused(false);
        } catch {
          setToast({ type: "error", message: "Unable to resume audio" });
        }
      } else {
        speechAudioRef.current.pause();
        setIsSpeechPaused(true);
      }
      return;
    }

    if (isSameMessage && synth.speaking && !synth.paused) {
      synth.pause();
      setIsSpeechPaused(true);
      return;
    }

    if (isSameMessage && synth.paused) {
      synth.resume();
      setIsSpeechPaused(false);
      return;
    }

    stopCurrentSpeechPlayback();

    const shouldPreferCloudSpeech = cloudTtsEnabled && !isLikelyMobileDevice();

    if (shouldPreferCloudSpeech) {
      try {
        await playCloudSpeech(messageId, trimmedContent);
        return;
      } catch {}
    }

    if (cloudTtsEnabled && isLikelyMobileDevice()) {
      try {
        await playCloudSpeech(messageId, trimmedContent);
        return;
      } catch {}
    }

    playBrowserSpeech(messageId, trimmedContent);
  };

  const submitSuggestionsFeedback = async (sentiment: "up" | "down") => {
    if (
      !session?.user?.id ||
      suggestionFeedbackLoading ||
      suggestions.length === 0
    ) {
      return;
    }

    setSuggestionFeedbackLoading(true);
    try {
      await Promise.all(
        suggestions.slice(0, 3).map((suggestion) =>
          axios.post("/api/chatbot/suggestions/feedback", {
            suggestion,
            sentiment,
          }),
        ),
      );

      setToast({
        type: "success",
        message:
          sentiment === "up"
            ? "Suggestions feedback saved"
            : "Noted. Suggestions will adapt",
      });
    } catch {
      setToast({
        type: "error",
        message: "Feedback save failed, please retry",
      });
    } finally {
      setSuggestionFeedbackLoading(false);
    }
  };

  const clearChat = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setMessages([initialGreeting]);
    setSuggestions([]);
    setUnreadCount(0);

    if (session?.user?.id) {
      try {
        if (sessionId) {
          await axios.delete(`/api/chatbot/history?sessionId=${sessionId}`);
          setSessionOptions((prev) =>
            prev.filter((item) => item.id !== sessionId),
          );
        }
        setSessionId(null);
      } catch {
        return;
      }
      return;
    }

    localStorage.removeItem("snapcart_chat_history");
  };

  const stopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const retryLastMessage = () => {
    if (!lastUserPrompt || loading) {
      return;
    }
    sendMessage(lastUserPrompt);
  };

  const startNewChat = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setSessionId(null);
    setMessages([initialGreeting]);
    setSuggestions([]);
    setLastUserPrompt("");
    setUnreadCount(0);
  };

  const switchSession = async (targetSessionId: string) => {
    if (!targetSessionId || loading) {
      return;
    }

    try {
      const response = await axios.get(
        `/api/chatbot/history?sessionId=${targetSessionId}`,
      );
      if (response.data?.success && response.data?.session?.messages?.length) {
        setSessionId(response.data.session.id || targetSessionId);
        setMessages(response.data.session.messages);
        setSuggestions([]);
        setUnreadCount(0);
      }
    } catch {
      return;
    }
  };

  const togglePinSession = async () => {
    if (!session?.user?.id || !sessionId || !activeSession || loading) {
      return;
    }

    try {
      const nextPinned = !activeSession.pinned;
      await axios.patch(`/api/chatbot/sessions/${sessionId}`, {
        pinned: nextPinned,
      });
      await fetchSessions(sessionSearch);
      setToast({
        type: "success",
        message: nextPinned ? "Chat pinned" : "Chat unpinned",
      });
    } catch {
      setToast({ type: "error", message: "Unable to update pin right now" });
      return;
    }
  };

  const startRenameSession = () => {
    if (!activeSession) {
      setToast({ type: "error", message: "Select a chat to rename" });
      return;
    }
    setEditingSessionId(activeSession.id);
    setEditingTitle(activeSession.title);
  };

  const saveSessionTitle = async () => {
    if (!session?.user?.id || !editingSessionId || loading) {
      return;
    }

    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      return;
    }

    try {
      await axios.patch(`/api/chatbot/sessions/${editingSessionId}`, {
        title: nextTitle,
      });
      setEditingSessionId(null);
      setEditingTitle("");
      await fetchSessions(sessionSearch);
      setToast({ type: "success", message: "Chat renamed" });
    } catch {
      setToast({ type: "error", message: "Unable to rename chat" });
      return;
    }
  };

  const cancelRenameSession = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const sendMessage = async (textToSend?: string) => {
    const finalMessage = (textToSend ?? input).trim();
    if (!finalMessage || loading) {
      return;
    }

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: finalMessage },
    ];
    const pendingMessages: Message[] = [
      ...nextMessages,
      { role: "assistant", content: "" },
    ];
    setMessages(pendingMessages);
    setSuggestions([]);
    setLastUserPrompt(finalMessage);
    setInput("");
    setLoading(true);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chatbot/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: finalMessage,
          history: nextMessages.slice(-8),
          sessionId,
          role,
          productContext,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Streaming unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";

      const appendAssistantChunk = (chunk: string) => {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const last = updated[lastIndex];
          if (last.role !== "assistant") {
            updated.push({ role: "assistant", content: chunk });
            return updated;
          }
          updated[lastIndex] = { ...last, content: `${last.content}${chunk}` };
          return updated;
        });
      };

      const handlePacket = (packet: {
        type?: string;
        content?: string;
        message?: string;
        sessionId?: string;
        suggestions?: string[];
      }) => {
        if (packet.type === "chunk" && typeof packet.content === "string") {
          appendAssistantChunk(packet.content);
        }

        if (packet.type === "done") {
          if (typeof packet.sessionId === "string" && packet.sessionId.trim()) {
            setSessionId(packet.sessionId);
          }
          if (Array.isArray(packet.suggestions)) {
            setSuggestions(packet.suggestions.slice(0, 3));
          }
        }

        if (packet.type === "error") {
          throw new Error(packet.message || "Failed to stream response");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          const packet = JSON.parse(line) as {
            type?: string;
            content?: string;
            message?: string;
            sessionId?: string;
            suggestions?: string[];
          };
          handlePacket(packet);
        }
      }

      if (streamBuffer.trim()) {
        const packet = JSON.parse(streamBuffer) as {
          type?: string;
          content?: string;
          message?: string;
          sessionId?: string;
          suggestions?: string[];
        };
        handlePacket(packet);
      }

      if (session?.user?.id) {
        await fetchSessions(sessionSearch);
      }
    } catch (streamError) {
      if (
        streamError instanceof DOMException &&
        streamError.name === "AbortError"
      ) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (
            updated[lastIndex]?.role === "assistant" &&
            !updated[lastIndex].content.trim()
          ) {
            updated[lastIndex] = {
              role: "assistant",
              content: "Generation stopped.",
            };
          }
          return updated;
        });
        return;
      }

      try {
        const fallbackResponse = await axios.post("/api/chatbot", {
          message: finalMessage,
          history: nextMessages.slice(-8),
          sessionId,
          role,
          productContext,
        });

        if (fallbackResponse.data?.success) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.role === "assistant") {
              updated[lastIndex] = {
                role: "assistant",
                content: fallbackResponse.data.reply,
              };
              return updated;
            }
            return [
              ...updated,
              { role: "assistant", content: fallbackResponse.data.reply },
            ];
          });

          if (
            typeof fallbackResponse.data.sessionId === "string" &&
            fallbackResponse.data.sessionId.trim()
          ) {
            setSessionId(fallbackResponse.data.sessionId);
          }
          if (Array.isArray(fallbackResponse.data.suggestions)) {
            setSuggestions(fallbackResponse.data.suggestions.slice(0, 3));
          }
        } else {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              role: "assistant",
              content:
                streamError instanceof Error
                  ? `Response issue: ${streamError.message}`
                  : "Abhi response generate nahi ho pa raha. Thoda der baad try karein.",
            },
          ]);
        }
      } catch (error: unknown) {
        const errorMessage =
          axios.isAxiosError(error) &&
          typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "Network issue aa gaya, please retry.";
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: errorMessage },
        ]);
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  return (
    <>
      {isPanelMounted ? (
        <div
          className={`fixed bg-white border border-gray-200 shadow-2xl z-[90] flex flex-col overflow-hidden transition-all duration-200 ease-out ${
            isFullscreen
              ? "inset-0 w-screen h-dvh max-h-dvh rounded-none"
              : "bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[560px] max-h-[80vh] rounded-2xl"
          } ${
            isPanelVisible
              ? "opacity-100 translate-y-0 scale-100"
              : isFullscreen
                ? "opacity-0 scale-[0.98]"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
          }`}
        >
          <div
            className={`bg-green-600 text-white flex items-center justify-between ${isFullscreen ? "px-5 py-4" : "px-4 py-3"}`}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="font-semibold leading-tight">Snapcart AI</p>
                <p className="text-xs text-green-100">
                  Role: {roleLabelMap[role] || "User"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="rounded-full p-1 hover:bg-green-700 transition-colors disabled:opacity-50"
                aria-label="Retry last message"
                type="button"
                disabled={!lastUserPrompt || loading}
                onClick={retryLastMessage}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="rounded-full p-1 hover:bg-green-700 transition-colors"
                aria-label={
                  isFullscreen ? "Exit full screen" : "Enter full screen"
                }
                title={isFullscreen ? "Exit full screen" : "Enter full screen"}
                type="button"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={clearChat}
                className="rounded-full p-1 hover:bg-green-700 transition-colors"
                aria-label="Clear chat"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={closeChatbot}
                className="rounded-full p-1 hover:bg-green-700 transition-colors"
                aria-label="Close chatbot"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {session?.user?.id ? (
            <div
              className={`border-b border-gray-200 bg-white space-y-2 ${
                isFullscreen ? "px-5 py-3" : "px-3 py-2"
              }`}
            >
              <div
                className={
                  isFullscreen ? "max-w-5xl mx-auto space-y-2" : "space-y-2"
                }
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="text-xs px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    New Chat
                  </button>
                  <input
                    ref={sessionSearchInputRef}
                    type="text"
                    value={sessionSearch}
                    onChange={(event) => setSessionSearch(event.target.value)}
                    placeholder="Search chats"
                    title="Press Ctrl+K to focus"
                    className="flex-1 text-xs rounded border border-gray-300 px-2 py-1 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sessionId || ""}
                    onChange={(event) => switchSession(event.target.value)}
                    className="flex-1 text-xs rounded border border-gray-300 px-2 py-1 outline-none"
                  >
                    <option value="">Current Chat</option>
                    {sessionOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {`${item.pinned ? "📌 " : ""}${item.title}${
                          item.title.trim().toLowerCase() === "untitled chat"
                            ? ` • ${getShortDateLabel(item.updatedAt)}`
                            : ""
                        }`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={togglePinSession}
                    disabled={!activeSession || loading}
                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    title={activeSession?.pinned ? "Unpin chat" : "Pin chat"}
                  >
                    {activeSession?.pinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={startRenameSession}
                    disabled={!activeSession || loading}
                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    title="Rename chat"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {sessionSearch.trim() && sessionOptions.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-500">Matched chats</p>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {sessionOptions.slice(0, 6).map((item) => {
                        const title = `${item.pinned ? "📌 " : ""}${item.title}`;
                        return (
                          <button
                            key={`match-${item.id}`}
                            type="button"
                            onClick={() => switchSession(item.id)}
                            className="w-full text-left text-xs px-2 py-1.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100"
                          >
                            {renderHighlightedText(title, sessionSearch)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {editingSessionId ? (
                  <div className="space-y-1">
                    {editingSessionMeta ? (
                      <p className="text-[11px] text-gray-500">
                        Editing: {editingSessionMeta.title}
                        {` • ${getShortDateLabel(editingSessionMeta.updatedAt)}`}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(event) =>
                          setEditingTitle(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveSessionTitle();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelRenameSession();
                          }
                        }}
                        placeholder="Chat title"
                        className="flex-1 text-xs rounded border border-gray-300 px-2 py-1 outline-none"
                        maxLength={140}
                      />
                      <button
                        type="button"
                        onClick={saveSessionTitle}
                        disabled={!editingTitle.trim() || loading}
                        className="text-xs px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelRenameSession}
                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {toast ? (
                  <p
                    className={`text-[11px] ${
                      toast.type === "success"
                        ? "text-green-700"
                        : "text-red-600"
                    }`}
                  >
                    {toast.message}
                  </p>
                ) : null}

                {sessionSearch.trim() && sessionOptions.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    No chats found for this search.
                  </p>
                ) : null}
                {sessionSearch.trim() && searchingSessions ? (
                  <p className="text-[11px] text-gray-500">
                    Searching chats...
                  </p>
                ) : null}
                {sessionSearchError ? (
                  <p className="text-[11px] text-red-600">
                    {sessionSearchError}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            ref={messagesScrollRef}
            className={`flex-1 bg-gray-50 space-y-3 overflow-y-auto ${isFullscreen ? "p-5" : "p-3"}`}
          >
            <div
              className={
                isFullscreen ? "max-w-5xl mx-auto space-y-3" : "space-y-3"
              }
            >
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {(() => {
                    const isAssistantPending =
                      loading &&
                      msg.role === "assistant" &&
                      index === messages.length - 1 &&
                      !msg.content.trim();

                    return (
                      <div
                        className={`${
                          isFullscreen
                            ? "max-w-[75%] text-[15px] leading-relaxed px-4 py-3"
                            : "max-w-[85%] text-sm px-3 py-2"
                        } rounded-2xl whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-green-600 text-white rounded-br-md"
                            : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                        }`}
                      >
                        {isAssistantPending ? (
                          <div className="inline-flex items-center gap-2 text-gray-600">
                            <span className="font-medium">
                              {getChatbotTypingLabel(
                                lastUserPrompt,
                                role,
                                Boolean(productContext),
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:120ms]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:240ms]" />
                            </span>
                          </div>
                        ) : (
                          msg.content
                        )}

                        {msg.role === "assistant" && msg.content.trim() ? (
                          <div className="mt-2 flex justify-end items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                toggleSpeechForMessage(
                                  `assistant-${index}`,
                                  msg.content,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
                              title={
                                speakingMessageId === `assistant-${index}` &&
                                !isSpeechPaused
                                  ? "Pause audio"
                                  : "Play audio"
                              }
                            >
                              {speakingMessageId === `assistant-${index}` &&
                              !isSpeechPaused ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              {speakingMessageId === `assistant-${index}` &&
                              !isSpeechPaused
                                ? "Pause"
                                : "Play"}
                            </button>

                            {[0.9, 1, 1.2].map((rate) => (
                              <button
                                key={`speech-rate-${rate}`}
                                type="button"
                                onClick={() => setSpeechRate(rate)}
                                className={`rounded-full border px-2 py-1 text-[11px] ${
                                  speechRate === rate
                                    ? "border-green-300 bg-green-50 text-green-700"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                                }`}
                                title={`Speech speed ${rate}x`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {suggestions.length > 0 ? (
            <div
              className={`border-t border-gray-200 bg-white flex gap-2 overflow-x-auto ${
                isFullscreen
                  ? "sticky bottom-[88px] z-[1] px-5 py-3"
                  : "px-3 py-2"
              }`}
            >
              <div
                className={
                  isFullscreen
                    ? "max-w-5xl mx-auto w-full space-y-2"
                    : "w-full space-y-2"
                }
              >
                <div className="flex gap-2 overflow-x-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      className={`whitespace-nowrap rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 ${
                        isFullscreen
                          ? "text-sm px-3 py-1.5"
                          : "text-xs px-2 py-1"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {session?.user?.id ? (
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span>Suggestions helpful?</span>
                    <button
                      type="button"
                      onClick={() => submitSuggestionsFeedback("up")}
                      disabled={suggestionFeedbackLoading}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                      title="Helpful suggestions"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => submitSuggestionsFeedback("down")}
                      disabled={suggestionFeedbackLoading}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                      title="Not helpful suggestions"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      No
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {hasUnreadIndicator ? (
            <button
              type="button"
              onClick={jumpToLatest}
              className={`absolute right-4 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 z-[5] ring-2 ring-green-200 ${
                unreadPulseActive ? "animate-pulse" : ""
              } ${isFullscreen ? "bottom-28 px-3 py-2 text-xs" : "bottom-20 px-2.5 py-1.5 text-[11px]"}`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              {unreadCount === 1 ? "1 new" : `${unreadCount} new`}
            </button>
          ) : null}

          <form
            className={`border-t border-gray-200 bg-white ${
              isFullscreen ? "sticky bottom-0 z-[2] p-5" : "p-3"
            }`}
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <div
              className={
                isFullscreen
                  ? "max-w-5xl mx-auto flex items-center gap-2"
                  : "flex items-center gap-2"
              }
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about Snapcart..."
                className={`flex-1 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-green-500 ${
                  isFullscreen ? "px-4 py-3 text-base" : "px-3 py-2 text-sm"
                }`}
              />
              <button
                type={loading ? "button" : "submit"}
                onClick={loading ? stopGenerating : undefined}
                disabled={!loading && !input.trim()}
                className={`rounded-xl bg-green-600 text-white disabled:opacity-50 ${
                  isFullscreen ? "p-3" : "p-2"
                }`}
                aria-label={loading ? "Stop generating" : "Send"}
              >
                {loading ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      ) : showLauncher && !isProductDetailsPage ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 sm:right-6 z-[90] bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2.5 rounded-full shadow-lg hover:shadow-purple-500/40 hover:scale-110 transition-all duration-300 group"
          aria-label="Open Snapcart AI chatbot"
          title="Ask Snapcart AI"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
        </button>
      ) : null}
    </>
  );
}
