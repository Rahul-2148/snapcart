"use client";

import axios from "axios";
import {
  ArrowDown,
  Bot,
  Check,
  Copy,
  History,
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
  Settings,
  Languages,
  Mic,
  MicOff,
  User,
  Menu,
  Plus,
  Folder,
  Archive,
  Heart,
  Search,
  HelpCircle,
  Keyboard,
  Paperclip,
  FileText,
  Camera,
  ChevronDown,
  ChevronRight,
  Share2,
  Edit3,
  Star,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "motion/react";

import { RootState } from "@/redux/store";
import { setCart, AppliedCoupon } from "@/redux/features/cartSlice";
import {
  addGuestCartApi,
  addToCartApi,
  updateCartQuantityApi,
  updateGuestCartApi,
  removeFromCartApi,
} from "@/hooks/cart.api";

type Message = {
  role: "user" | "assistant";
  content: string;
  products?: any[];
  translatedContent?: Record<string, string>;
  activeLang?: string;
  isTranslating?: boolean;
};

type ChatSessionOption = {
  id: string;
  title: string;
  pinned?: boolean;
  archived?: boolean;
  isFavorite?: boolean;
  folderId?: string;
  category?: string;
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

const getModeGreeting = (
  mode: "agent" | "normal" | "expert",
  userName?: string,
  lang?: string,
): Message => {
  const hour = new Date().getHours();
  let activeLang = lang;

  if (!activeLang && typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("snapcart_chatbot_settings");
      if (saved) {
        activeLang = JSON.parse(saved).primaryLanguage;
      }
    } catch {}
  }

  if (activeLang === "hi") {
    let timeGreeting = "नमस्ते! 🌙";
    if (hour < 12) timeGreeting = "शुभ प्रभात! ☀️";
    else if (hour < 16) timeGreeting = "नमस्कार! 🌤️";
    else if (hour < 20) timeGreeting = "शुभ संध्या! 🌆";
    
    const greetingTarget = userName ? ` ${userName}` : " अतिथि";
    
    if (mode === "agent") {
      return {
        role: "assistant",
        content: `${timeGreeting}${greetingTarget}! मैं स्नैपकार्ट स्वायत्त एजेंट इंजन (SC-909) हूँ। मैं ऑटो-ऑर्डरिंग, खर्च विश्लेषण, कूपन अनुकूलन, गतिशील मूल्य निर्धारण और उपयोगकर्ता प्रोफाइलिंग कार्यों को चला सकता हूँ। चलिए, आदेश दें!`,
      };
    }
    if (mode === "normal") {
      return {
        role: "assistant",
        content: `${timeGreeting}${greetingTarget}! मैं स्नैपकार्ट क्यूएंडए डेस्क हूँ। आप ऑर्डर ट्रैकिंग नीतियों, रिफंड विवरण, उत्पाद उपलब्धता या स्टोर से संबंधित किसी भी सामान्य जानकारी के बारे में पूछ सकते हैं। मैं जानकारी खोज सकता हूँ।`,
      };
    }
    return {
      role: "assistant",
      content: `${timeGreeting}${greetingTarget}! मैं आपका स्नैपकार्ट व्यक्तिगत शॉपिंग विशेषज्ञ और आहार सलाहकार हूँ। मैं इकाइयों की कीमतों की तुलना, किराने के बजट का अनुकूलन, स्वस्थ विकल्प/व्यंजनों का सुझाव और प्रत्यक्ष कार्ट आइटम प्रबंधन कर सकता हूँ। चलिए, शुरू करें!`,
    };
  }

  if (activeLang === "en") {
    let timeGreeting = "Hello! 🌙";
    if (hour < 12) timeGreeting = "Good morning! ☀️";
    else if (hour < 16) timeGreeting = "Good afternoon! 🌤️";
    else if (hour < 20) timeGreeting = "Good evening! 🌆";
    
    const greetingTarget = userName ? ` ${userName}` : " Guest";
    
    if (mode === "agent") {
      return {
        role: "assistant",
        content: `${timeGreeting}${greetingTarget}! I am the Snapcart Autonomous Agent Engine (SC-909). I can run auto-ordering, spending analysis, coupons optimization, dynamic pricing, and user profiling tasks. Let's start!`,
      };
    }
    if (mode === "normal") {
      return {
        role: "assistant",
        content: `${timeGreeting}${greetingTarget}! I am the Snapcart Q&A Desk. You can ask about order tracking policies, refund details, product availability, or anything related to the store. How can I help you today?`,
      };
    }
    return {
      role: "assistant",
      content: `${timeGreeting}${greetingTarget}! I am your Snapcart Personal Shopping Expert and Diet Advisor. I can compare unit prices, optimize grocery budgets, suggest healthy alternatives/recipes, and directly manage your cart items. Let's get started!`,
    };
  }

  // Default Hinglish Welcome Messages
  let timeGreeting = "Namaste";
  if (hour < 12) timeGreeting = "Good morning! ☀️";
  else if (hour < 16) timeGreeting = "Good afternoon! 🌤️";
  else if (hour < 20) timeGreeting = "Good evening! 🌆";
  else timeGreeting = "Namaste! 🌙";

  const greetingTarget = userName ? ` ${userName}` : " Guest";

  if (mode === "agent") {
    return {
      role: "assistant",
      content: `${timeGreeting}${greetingTarget}! Main Snapcart Autonomous Agent Engine (SC-909) hoon. Main auto-ordering, spending analysis, coupons optimization, dynamic pricing, aur user profiling tasks run kar sakta hoon. Chaliye, command dijiye!`,
    };
  }

  if (mode === "normal") {
    return {
      role: "assistant",
      content: `${timeGreeting}${greetingTarget}! Main Snapcart Q&A Desk hoon. Aap order tracking policies, refund details, product availability, ya store related kuch bhi general information pooch sakte hain. Main information search lookup kar sakta hoon.`,
    };
  }

  return {
    role: "assistant",
    content: `${timeGreeting}${greetingTarget}! Main aapka Snapcart Personal Shopping Expert aur Diet advisor hoon. Main unit prices compare, grocery budget optimization, healthy alternatives/recipes suggest aur direct cart items management kr sakta hoon. Chaliye, shuru karein!`,
  };
};

const modePlaceholders: Record<"agent" | "normal" | "expert", string> = {
  agent: "Ask Agent SC-909 to run forecast, pricing, reorder, spend analysis...",
  normal: "Ask anything about store policies or product info...",
  expert: "Ask Shop Expert to find recipe ingredients, compare prices, plan groceries...",
};

export const themes = {
  emerald: {
    bg: "bg-emerald-600",
    gradient: "from-emerald-600 via-emerald-600 to-teal-650",
    hoverGradient: "hover:from-emerald-700 hover:to-teal-750",
    text: "text-emerald-700",
    textDark: "text-emerald-800",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-500/20",
    borderHighlight: "border-emerald-500",
    borderLeftHighlight: "border-l-emerald-600",
    ring: "focus:ring-emerald-500",
    outlineBorder: "border-emerald-300",
    accentGlow: "shadow-emerald-500/5",
  },
  violet: {
    bg: "bg-violet-600",
    gradient: "from-violet-600 via-violet-600 to-purple-650",
    hoverGradient: "hover:from-violet-700 hover:to-purple-750",
    text: "text-violet-700",
    textDark: "text-violet-800",
    bgLight: "bg-violet-50",
    borderLight: "border-violet-500/20",
    borderHighlight: "border-violet-500",
    borderLeftHighlight: "border-l-violet-600",
    ring: "focus:ring-violet-500",
    outlineBorder: "border-violet-300",
    accentGlow: "shadow-violet-500/5",
  },
  rose: {
    bg: "bg-rose-600",
    gradient: "from-rose-600 via-rose-600 to-pink-650",
    hoverGradient: "hover:from-rose-700 hover:to-pink-750",
    text: "text-rose-700",
    textDark: "text-rose-800",
    bgLight: "bg-rose-50",
    borderLight: "border-rose-500/20",
    borderHighlight: "border-rose-500",
    borderLeftHighlight: "border-l-rose-600",
    ring: "focus:ring-rose-500",
    outlineBorder: "border-rose-300",
    accentGlow: "shadow-rose-500/5",
  },
  amber: {
    bg: "bg-amber-600",
    gradient: "from-amber-600 via-amber-650 to-orange-600",
    hoverGradient: "hover:from-amber-700 hover:to-orange-700",
    text: "text-amber-700",
    textDark: "text-amber-800",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-500/20",
    borderHighlight: "border-amber-500",
    borderLeftHighlight: "border-l-amber-600",
    ring: "focus:ring-amber-500",
    outlineBorder: "border-amber-300",
    accentGlow: "shadow-amber-500/5",
  },
};

const initialGreeting = getModeGreeting("agent");

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

  if (/\b(order|track|eta|delivery)\b/.test(text)) {
    return "Checking your order updates...";
  }

  if (/\b(return|refund|replace)\b/.test(text)) {
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

function ChatProductCard({
  product,
  cartItems,
  session,
  onUpdateCart,
}: {
  product: any;
  cartItems: any[];
  session: any;
  onUpdateCart: (variantId: string, currentQty: number, nextQty: number, cartItemId?: string) => Promise<void>;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants?.find((v: any) => v.isDefault)?._id || product.variants?.[0]?._id || ""
  );

  const selectedVariant = useMemo(() => {
    return product.variants?.find((v: any) => v._id === selectedVariantId) || product.variants?.[0];
  }, [product.variants, selectedVariantId]);

  const cartItem = useMemo(() => {
    if (!selectedVariant) return null;
    return cartItems.find((item) => item.variant?._id === selectedVariant._id);
  }, [cartItems, selectedVariant]);

  const quantity = cartItem?.quantity ?? 0;

  if (!selectedVariant) return null;

  const sellingPrice = selectedVariant.price?.selling ?? 0;
  const mrpPrice = selectedVariant.price?.mrp ?? 0;
  const discountPercent = mrpPrice > sellingPrice ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0;

  return (
    <div className="w-[155px] sm:w-[170px] flex-shrink-0 bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group">
      {discountPercent > 0 && (
        <span className="absolute top-2 left-2 bg-pink-50 text-pink-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-[1]">
          {discountPercent}% OFF
        </span>
      )}
      
      {/* Product Image */}
      <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden mb-2 relative">
        {product.images && product.images[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="text-slate-350 text-[10px] font-bold uppercase select-none">{product.brand || "Snapcart"}</div>
        )}
      </div>

      {/* Brand & Name */}
      <div className="flex-1 flex flex-col min-h-[44px] mb-1.5">
        {product.brand && (
          <span className="text-[9px] text-gray-400 font-extrabold tracking-wider uppercase block truncate">
            {product.brand}
          </span>
        )}
        <span className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">
          {product.name}
        </span>
      </div>

      {/* Variant Selector */}
      <div className="mb-2">
        {product.variants && product.variants.length > 1 ? (
          <select
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-gray-600 outline-none cursor-pointer"
          >
            {product.variants.map((v: any) => (
              <option key={v._id} value={v._id}>
                {v.label} - ₹{v.price.selling}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-gray-500 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 block text-center truncate">
            {selectedVariant.label}
          </span>
        )}
      </div>

      {/* Pricing and Cart Actions */}
      <div className="flex items-center justify-between gap-1 mt-auto">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-800">
            ₹{sellingPrice}
          </span>
          {mrpPrice > sellingPrice && (
            <span className="text-[10px] text-gray-400 line-through">
              ₹{mrpPrice}
            </span>
          )}
        </div>

        {quantity > 0 ? (
          <div className="flex items-center bg-emerald-600 text-white rounded-lg h-7 shadow-sm border border-emerald-500 overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdateCart(selectedVariant._id, quantity, quantity - 1, cartItem?._id)}
              className="px-2 h-full hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center justify-center font-bold text-xs"
            >
              -
            </button>
            <span className="px-1 text-[11px] font-bold select-none min-w-[14px] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateCart(selectedVariant._id, quantity, quantity + 1, cartItem?._id)}
              className="px-2 h-full hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onUpdateCart(selectedVariant._id, 0, 1)}
            disabled={selectedVariant.countInStock === 0}
            className="px-3 h-7 bg-white text-emerald-600 border border-emerald-300 rounded-lg text-[11px] font-extrabold hover:bg-emerald-50 hover:border-emerald-500 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedVariant.countInStock === 0 ? "Out of Stock" : "Add"}
          </button>
        )}
      </div>
    </div>
  );
}

type GuestSession = {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  isFavorite: boolean;
  folderId?: string;
  category?: string;
  updatedAt: string;
  messages: Message[];
  mode: "agent" | "normal" | "expert";
};

const getGuestSessions = (): GuestSession[] => {
  if (typeof window === "undefined") return [];
  const val = localStorage.getItem("snapcart_guest_sessions");
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
};

const saveGuestSessions = (sessions: GuestSession[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("snapcart_guest_sessions", JSON.stringify(sessions));
};

const getLanguageLabel = (langCode: string): string => {
  const labels: Record<string, string> = {
    en: "English",
    hi: "हिन्दी (Hindi)",
    hinglish: "Hinglish",
    bn: "বাংলা (Bengali)",
    mr: "मराठी (Marathi)",
    ta: "தமிழ் (Tamil)",
    te: "తెలుగు (Telugu)",
    kn: "ಕನ್ನಡ (Kannada)",
    ml: "മലയാളം (Malayalam)",
    gu: "ગુજરાતી (Gujarati)",
    pa: "ਪੰਜਾਬੀ (Punjabi)",
    ur: "اردو (Urdu)",
    or: "ଓଡ଼ିଆ (Odia)",
    as: "অસમীয়া (Assamese)",
  };
  return labels[langCode] || langCode;
};

export default function SnapcartAIChatbot({
  showLauncher = true,
}: SnapcartAIChatbotProps) {
  const cloudTtsEnabled = process.env.NEXT_PUBLIC_ENABLE_NEURAL_TTS === "true";
  const { data: session } = useSession();
  const pathname = usePathname();
  const { userData } = useSelector((state: RootState) => state.user);
  const { cartItems } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const isProductDetailsPage = pathname?.includes("/product-details/");

  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"agent" | "normal" | "expert">("agent");

  const [chatbotSettings, setChatbotSettings] = useState({
    language: "hinglish",
    primaryLanguage: "hinglish",
    secondaryLanguage: "en",
    theme: "system" as "light" | "dark" | "system",
    fontSize: "medium" as "small" | "medium" | "large",
    density: "cozy" as "compact" | "cozy" | "spacious",
    timeFormat: "12h" as "12h" | "24h",

    accentColor: "emerald" as "emerald" | "violet" | "rose" | "amber",
    chatWidth: "normal" as "narrow" | "normal" | "wide",
    bubbleStyle: "rounded" as "rounded" | "sharp" | "modern",
    animations: true,
    blurEffects: true,

    enterToSend: true,
    markdownEnabled: true,
    codeHighlighting: true,
    streamingEnabled: true,
    autoScroll: true,
    typingAnimation: true,
    messageTimestamps: true,
    smartSuggestions: true,

    responseLength: "medium" as "short" | "medium" | "detailed",
    creativity: 0.7,
    temperature: 0.7,
    preferredModel: "gemini-1.5-flash",
    systemPrompt: "",
    memoryEnabled: true,
    contextLength: 10,

    voiceInputEnabled: true,
    voiceOutputEnabled: true,
    speechSpeed: 1.0,
    voiceLanguage: "en-US",

    browserNotifications: false,
    soundEnabled: false,
    messageAlerts: true,

    chatHistoryEnabled: true,
    personalizationEnabled: true,
    developerMode: false,
    debugLogs: false,
    experimentalFeatures: false,
  });

  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "appearance" | "chat" | "ai" | "voice" | "notifications" | "privacy" | "advanced">("general");
  const [historyFilter, setHistoryFilter] = useState<"active" | "pinned" | "favorites" | "archived">("active");
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; type: string; size: number; url?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearch, setSlashSearch] = useState("");
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([initialGreeting]);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
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
  const [activeTheme, setActiveTheme] = useState<"emerald" | "violet" | "rose" | "amber">("emerald");
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const DEFAULT_SETTINGS = useMemo(() => ({
    language: "hinglish",
    primaryLanguage: "hinglish",
    secondaryLanguage: "en",
    theme: "system" as "light" | "dark" | "system",
    fontSize: "medium" as "small" | "medium" | "large",
    density: "cozy" as "compact" | "cozy" | "spacious",
    timeFormat: "12h" as "12h" | "24h",

    accentColor: "emerald" as "emerald" | "violet" | "rose" | "amber",
    chatWidth: "normal" as "narrow" | "normal" | "wide",
    bubbleStyle: "rounded" as "rounded" | "sharp" | "modern",
    animations: true,
    blurEffects: true,

    enterToSend: true,
    markdownEnabled: true,
    codeHighlighting: true,
    streamingEnabled: true,
    autoScroll: true,
    typingAnimation: true,
    messageTimestamps: true,
    smartSuggestions: true,

    responseLength: "medium" as "short" | "medium" | "detailed",
    creativity: 0.7,
    temperature: 0.7,
    preferredModel: "gemini-1.5-flash",
    systemPrompt: "",
    memoryEnabled: true,
    contextLength: 10,

    voiceInputEnabled: true,
    voiceOutputEnabled: true,
    speechSpeed: 1.0,
    voiceLanguage: "en-US",

    browserNotifications: false,
    soundEnabled: false,
    messageAlerts: true,

    chatHistoryEnabled: true,
    personalizationEnabled: true,
    developerMode: false,
    debugLogs: false,
    experimentalFeatures: false,
  }), []);

  const updateSettings = useCallback(async (updates: Partial<typeof DEFAULT_SETTINGS>) => {
    setChatbotSettings((prev) => {
      const nextSettings = { ...prev, ...updates };

      if (updates.accentColor) setActiveTheme(updates.accentColor);
      if (updates.speechSpeed !== undefined) setSpeechRate(updates.speechSpeed);
      if (updates.voiceOutputEnabled !== undefined) {
        setSpeechMode(updates.voiceOutputEnabled ? "browser" : "none");
      }
      if (updates.browserNotifications === true && typeof window !== "undefined" && "Notification" in window) {
        Notification.requestPermission();
      }

      localStorage.setItem("snapcart_chatbot_settings", JSON.stringify(nextSettings));

      if (session?.user?.id) {
        axios.post("/api/chatbot/settings", updates).catch((err) => {
          console.error("Failed to sync settings to backend:", err);
        });
      }

      // Flash "Saved" indicator
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 1500);

      return nextSettings;
    });
  }, [session?.user?.id]);

  const saveChatbotSetting = useCallback((key: string, value: any) => {
    updateSettings({ [key]: value });
  }, [updateSettings]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (session?.user?.id) {
        try {
          const res = await axios.get("/api/chatbot/settings");
          if (res.data?.success && res.data?.settings) {
            const merged = { ...DEFAULT_SETTINGS, ...res.data.settings };
            setChatbotSettings(merged);
            if (merged.accentColor) setActiveTheme(merged.accentColor);
            if (merged.speechSpeed !== undefined) setSpeechRate(merged.speechSpeed);
            setSpeechMode(merged.voiceOutputEnabled ? "browser" : "none");
          }
        } catch (e) {
          console.error("Failed to fetch settings from backend:", e);
        }
      } else {
        const savedSettings = localStorage.getItem("snapcart_chatbot_settings");
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            const merged = { ...DEFAULT_SETTINGS, ...parsed };
            setChatbotSettings(merged);
            if (merged.accentColor) setActiveTheme(merged.accentColor);
            if (merged.speechSpeed !== undefined) setSpeechRate(merged.speechSpeed);
            setSpeechMode(merged.voiceOutputEnabled ? "browser" : "none");
          } catch (e) {
            console.error("Error parsing guest chatbot settings:", e);
          }
        }
      }
    };
    fetchSettings();
  }, [session?.user?.id, DEFAULT_SETTINGS]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustInputHeight = () => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "38px";
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${nextHeight}px`;
  };

  const SLASH_COMMANDS = useMemo(() => [
    { command: "/help", description: "Show help menu of features", icon: "❓" },
    { command: "/search", description: "Search products in store", icon: "🔍" },
    { command: "/think", description: "Deep analysis mode for complex queries", icon: "🧠" },
    { command: "/compare", description: "Compare two products side by side", icon: "⚖️" },
    { command: "/recipe", description: "Get recipe + auto-add ingredients to cart", icon: "🍳" },
    { command: "/reorder", description: "Reorder last delivery and apply coupon", icon: "🔄" },
    { command: "/diet", description: "Scan cart health for diet compatibility", icon: "🥗" },
    { command: "/spend", description: "Show spend analytics dashboard", icon: "📊" },
    { command: "/coupon", description: "Search and apply best coupon to cart", icon: "🎟️" },
    { command: "/track", description: "Track your latest order status", icon: "📦" },
    { command: "/budget", description: "Set shopping budget and get alerts", icon: "💰" },
    { command: "/translate", description: "Translate last response to any language", icon: "🌐" },
    { command: "/clear", description: "Clear current chat messages", icon: "🗑️" },
  ], []);

  const filteredCommands = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const term = input.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter((cmd) => cmd.command.toLowerCase().includes("/" + term));
  }, [input, SLASH_COMMANDS]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedSlashIndex];
        if (selected) {
          setInput(selected.command);
          setShowSlashMenu(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashMenu(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      if (chatbotSettings.enterToSend) {
        e.preventDefault();
        sendMessage();
      }
    } else if (e.key === "Escape") {
      setShowSettings(false);
    }
  };

  useEffect(() => {
    if (input.startsWith("/")) {
      setShowSlashMenu(true);
      setSelectedSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  }, [input]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newAttachments = files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
      setToast({ type: "success", message: `Attached ${files.length} file(s)` });
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        const newAttachments = imageFiles.map((f) => ({
          name: f.name || "Pasted Image",
          type: f.type,
          size: f.size,
          url: URL.createObjectURL(f),
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
        setToast({ type: "success", message: "Image pasted from clipboard" });
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

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
  const sendMessageRef = useRef<(text?: string) => Promise<void>>(async () => {});



  const role = useMemo(() => {
    const sessionUser = session?.user as Session["user"] | undefined;
    const currentRole =
      userData?.currentRole || sessionUser?.currentRole || "guest";
    return currentRole;
  }, [session?.user, userData?.currentRole]);

  const userName = useMemo(() => {
    return userData?.name || session?.user?.name || undefined;
  }, [userData?.name, session?.user?.name]);

  // Synchronize initial greeting when preferred language changes (and no other conversation history exists on screen)
  useEffect(() => {
    if (
      messages.length === 1 &&
      messages[0].role === "assistant" &&
      !messages[0].content.includes("User Query:")
    ) {
      setMessages([
        getModeGreeting(
          activeMode,
          userName,
          chatbotSettings.primaryLanguage,
        ),
      ]);
    }
  }, [chatbotSettings.primaryLanguage, activeMode, userName]);

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
      const trimmedQuery = query?.trim() || "";

      if (!session?.user?.id) {
        setSearchingSessions(true);
        setSessionSearchError(null);
        try {
          const allSessions = getGuestSessions();
          let filtered = allSessions.filter((s) => s.mode === activeMode);

          // Apply history filter
          if (historyFilter === "active") {
            filtered = filtered.filter((s) => !s.archived);
          } else if (historyFilter === "archived") {
            filtered = filtered.filter((s) => s.archived);
          } else if (historyFilter === "favorites") {
            filtered = filtered.filter((s) => s.isFavorite);
          } else if (historyFilter === "pinned") {
            filtered = filtered.filter((s) => s.pinned);
          }

          if (trimmedQuery) {
            const regex = new RegExp(escapeRegex(trimmedQuery), "i");
            filtered = filtered.filter(
              (s) =>
                regex.test(s.title) ||
                s.messages.some((m) => regex.test(m.content))
            );
          }
          filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
          setSessionOptions(
            filtered.map((s) => ({
              id: s.id,
              title: s.title,
              pinned: s.pinned,
              archived: s.archived,
              isFavorite: s.isFavorite,
              folderId: s.folderId,
              category: s.category,
              updatedAt: s.updatedAt,
            }))
          );
        } catch {
          setSessionSearchError("Failed to fetch local sessions");
        } finally {
          setSearchingSessions(false);
        }
        return;
      }

      const requestId = latestSessionsRequestRef.current + 1;
      latestSessionsRequestRef.current = requestId;
      setSearchingSessions(true);
      setSessionSearchError(null);

      const endpoint = trimmedQuery
        ? `/api/chatbot/sessions?mode=${activeMode}&filterType=${historyFilter}&q=${encodeURIComponent(trimmedQuery)}`
        : `/api/chatbot/sessions?mode=${activeMode}&filterType=${historyFilter}`;

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
    [session?.user?.id, activeMode, historyFilter],
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
      setSessionId(null);
      setMessages([getModeGreeting(activeMode, userName)]);
      setSuggestions([]);
      setHistoryLoading(true);

      if (session?.user?.id) {
        try {
          await fetchSessions();

          const response = await axios.get(`/api/chatbot/history?mode=${activeMode}`);
          if (
            response.data?.success &&
            response.data?.session?.messages?.length
          ) {
            setMessages(response.data.session.messages);
            setSessionId(response.data.session.id || null);
          } else {
            setMessages([getModeGreeting(activeMode, userName)]);
            setSessionId(null);
          }
        } catch {
          setMessages([getModeGreeting(activeMode, userName)]);
          setSessionId(null);
        } finally {
          setHistoryLoading(false);
        }
        return;
      }

      // Guest sessions initialization
      try {
        await fetchSessions();
        const allSessions = getGuestSessions();
        const modeSessions = allSessions.filter((s) => s.mode === activeMode);
        if (modeSessions.length > 0) {
          modeSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          const latest = modeSessions[0];
          setSessionId(latest.id);
          setMessages(latest.messages);
        } else {
          const newSessionId = `guest-session-${Date.now()}`;
          const newSession: GuestSession = {
            id: newSessionId,
            title: "Untitled chat",
            pinned: false,
            archived: false,
            isFavorite: false,
            updatedAt: new Date().toISOString(),
            messages: [getModeGreeting(activeMode, userName)],
            mode: activeMode,
          };
          saveGuestSessions([...allSessions, newSession]);
          setSessionId(newSessionId);
          setMessages([getModeGreeting(activeMode, userName)]);
          setSessionOptions([{
            id: newSessionId,
            title: "Untitled chat",
            pinned: false,
            archived: false,
            isFavorite: false,
            updatedAt: newSession.updatedAt,
          }]);
        }
      } catch {
        setMessages([getModeGreeting(activeMode, userName)]);
        setSessionId(null);
      } finally {
        setHistoryLoading(false);
      }
    };

    initHistory();
  }, [fetchSessions, session?.user?.id, activeMode, userName]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSessions(sessionSearch).catch(() => undefined);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [fetchSessions, sessionSearch]);

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
      if (customEvent.detail?.productContext) {
        setProductContext(customEvent.detail.productContext);
      }

      setIsOpen(true);

      if (prefill) {
        setInput("");
        // Tiny timeout to let modal transition mount fully
        setTimeout(() => {
          sendMessageRef.current(prefill);
        }, 150);
      }
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
    if (!isOpen || !autoScrollEnabledRef.current || !chatbotSettings.autoScroll) {
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

      if (name.includes("google")) score += 120; // Highly prioritize Chrome's built-in fluent Google voices
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
    const lower = normalized.toLowerCase();
    const hasHindiHint =
      /[\u0900-\u097F]/.test(normalized) ||
      /(kya|kaise|hai|mera|mere|aap|nahi|batao|samjhao|kr|kar|delivery|order|returns|admin)/.test(
        lower,
      );
    const preferredFallbackLang = hasHindiHint ? "hi-IN" : "en-IN";

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

      utterance.rate = speechRate;
      utterance.pitch = 1.0;
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

  const handleTranslateMessage = async (messageIndex: number, targetLang: string) => {
    const msg = messages[messageIndex];
    if (!msg) return;

    // Immediately stop current audio playback on language change
    stopCurrentSpeechPlayback();

    if (targetLang === "original") {
      setMessages((prev) => {
        const updated = [...prev];
        updated[messageIndex] = {
          ...updated[messageIndex],
          activeLang: "original",
        };
        return updated;
      });
      return;
    }



    if (msg.translatedContent?.[targetLang]) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[messageIndex] = {
          ...updated[messageIndex],
          activeLang: targetLang,
        };
        return updated;
      });
      return;
    }

    // Set translation loading indicator
    setMessages((prev) => {
      const updated = [...prev];
      updated[messageIndex] = {
        ...updated[messageIndex],
        isTranslating: true,
      };
      return updated;
    });

    try {
      const response = await axios.post("/api/chatbot/translate", {
        text: msg.content,
        targetLang,
      });

      if (response.data?.success && response.data?.translatedText) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[messageIndex] = {
            ...updated[messageIndex],
            translatedContent: {
              ...updated[messageIndex].translatedContent,
              [targetLang]: response.data.translatedText,
            },
            activeLang: targetLang,
            isTranslating: false,
          };
          return updated;
        });
      } else {
        throw new Error(response.data?.message || "Translation failed");
      }
    } catch (err) {
      console.error("Translation error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[messageIndex] = {
          ...updated[messageIndex],
          isTranslating: false,
        };
        return updated;
      });
      setToast({
        type: "error",
        message: "Translation failed, please try again.",
      });
    }
  };

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToast({ type: "error", message: "Voice typing is not supported in this browser." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    const langMap: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      hinglish: "en-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      ta: "ta-IN",
      te: "te-IN",
      kn: "kn-IN",
      ml: "ml-IN",
      gu: "gu-IN",
      pa: "pa-IN",
      ur: "ur-IN",
      or: "or-IN",
      as: "as-IN"
    };
    recognition.lang = langMap[chatbotSettings.primaryLanguage] || "en-IN";

    const baseText = input;

    recognition.onstart = () => {
      setIsRecording(true);
      setToast({ type: "success", message: "Listening... speak now." });
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentSpeech = finalTranscript || interimTranscript;
      if (currentSpeech) {
        setInput(baseText ? `${baseText} ${currentSpeech}` : currentSpeech);
        setTimeout(() => adjustInputHeight(), 10);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
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
    setConfirmDialog({
      isOpen: true,
      title: "Clear Conversation",
      message: "Are you sure you want to clear this entire conversation? This cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setLoading(false);
        setMessages([getModeGreeting(activeMode, userName)]);
        setSuggestions([]);
        setUnreadCount(0);

        if (!session?.user?.id) {
          if (sessionId) {
            const allSessions = getGuestSessions();
            const updated = allSessions.filter((s) => s.id !== sessionId);
            saveGuestSessions(updated);
          }
          setSessionId(null);
          setToast({ type: "success", message: "Conversation cleared." });
          await fetchSessions(sessionSearch);
          return;
        }

        try {
          if (sessionId) {
            await axios.delete(`/api/chatbot/history?sessionId=${sessionId}`);
            setSessionOptions((prev) =>
              prev.filter((item) => item.id !== sessionId),
            );
          }
          setSessionId(null);
          setToast({ type: "success", message: "Conversation cleared successfully." });
        } catch {
          setToast({ type: "error", message: "Failed to delete chat history from server." });
        }
      }
    });
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
    setAttachments([]);

    if (!session?.user?.id) {
      const allSessions = getGuestSessions();
      const newSessionId = `guest-session-${Date.now()}`;
      const newSession: GuestSession = {
        id: newSessionId,
        title: "Untitled chat",
        pinned: false,
        archived: false,
        isFavorite: false,
        updatedAt: new Date().toISOString(),
        messages: [getModeGreeting(activeMode, userName)],
        mode: activeMode,
      };
      saveGuestSessions([...allSessions, newSession]);
      setSessionId(newSessionId);
      setMessages([getModeGreeting(activeMode, userName)]);
      setSuggestions([]);
      setLastUserPrompt("");
      setUnreadCount(0);
      fetchSessions();
      return;
    }

    setSessionId(null);
    setMessages([getModeGreeting(activeMode, userName)]);
    setSuggestions([]);
    setLastUserPrompt("");
    setUnreadCount(0);
  };

  const switchSession = async (targetSessionId: string) => {
    if (!targetSessionId || loading) {
      return;
    }

    if (!session?.user?.id) {
      const allSessions = getGuestSessions();
      const target = allSessions.find((s) => s.id === targetSessionId);
      if (target) {
        setSessionId(target.id);
        setMessages(target.messages);
        setSuggestions([]);
        setUnreadCount(0);
      }
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

  const updateSessionField = async (id: string, fields: { pinned?: boolean; archived?: boolean; isFavorite?: boolean }) => {
    if (loading) return;

    if (!session?.user?.id) {
      const allSessions = getGuestSessions();
      const updated = allSessions.map((s) => {
        if (s.id === id) {
          return { ...s, ...fields, updatedAt: new Date().toISOString() };
        }
        return s;
      });
      saveGuestSessions(updated);
      await fetchSessions(sessionSearch);
      
      let msg = "Chat updated";
      if (fields.pinned !== undefined) msg = fields.pinned ? "Chat pinned" : "Chat unpinned";
      if (fields.archived !== undefined) msg = fields.archived ? "Chat archived" : "Chat unarchived";
      if (fields.isFavorite !== undefined) msg = fields.isFavorite ? "Added to favorites" : "Removed from favorites";
      setToast({ type: "success", message: msg });
      return;
    }

    try {
      await axios.patch(`/api/chatbot/sessions/${id}`, fields);
      await fetchSessions(sessionSearch);
      let msg = "Chat updated";
      if (fields.pinned !== undefined) msg = fields.pinned ? "Chat pinned" : "Chat unpinned";
      if (fields.archived !== undefined) msg = fields.archived ? "Chat archived" : "Chat unarchived";
      if (fields.isFavorite !== undefined) msg = fields.isFavorite ? "Added to favorites" : "Removed from favorites";
      setToast({ type: "success", message: msg });
    } catch {
      setToast({ type: "error", message: "Failed to update chat" });
    }
  };

  const duplicateSession = async (id: string) => {
    if (loading) return;

    if (!session?.user?.id) {
      const allSessions = getGuestSessions();
      const src = allSessions.find((s) => s.id === id);
      if (!src) return;

      const newSession: GuestSession = {
        id: "guest-" + Date.now() + Math.random().toString(36).slice(2, 9),
        title: src.title ? `${src.title} (Copy)` : "Untitled chat (Copy)",
        pinned: false,
        archived: false,
        isFavorite: false,
        messages: src.messages.map((m) => ({ ...m })),
        mode: src.mode,
        updatedAt: new Date().toISOString(),
      };
      
      saveGuestSessions([newSession, ...allSessions]);
      await fetchSessions(sessionSearch);
      setToast({ type: "success", message: "Chat duplicated successfully" });
      return;
    }

    try {
      const res = await axios.post("/api/chatbot/sessions", {
        duplicateFromSessionId: id,
        mode: activeMode,
      });
      if (res.data?.success) {
        await fetchSessions(sessionSearch);
        setToast({ type: "success", message: "Chat duplicated successfully" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to duplicate chat" });
    }
  };

  const deleteSessionId = async (id: string) => {
    if (loading) {
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Chat Session",
      message: "Are you sure you want to delete this chat session?",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (!session?.user?.id) {
          const allSessions = getGuestSessions();
          const updated = allSessions.filter((s) => s.id !== id);
          saveGuestSessions(updated);
          if (sessionId === id) {
            setSessionId(null);
            setMessages([getModeGreeting(activeMode, userName)]);
            setSuggestions([]);
          }
          await fetchSessions(sessionSearch);
          setToast({ type: "success", message: "Chat session deleted" });
          return;
        }

        try {
          await axios.delete(`/api/chatbot/history?sessionId=${id}`);
          setSessionOptions((prev) => prev.filter((item) => item.id !== id));
          if (sessionId === id) {
            setSessionId(null);
            setMessages([getModeGreeting(activeMode, userName)]);
            setSuggestions([]);
          }
          setToast({ type: "success", message: "Chat session deleted" });
        } catch {
          setToast({ type: "error", message: "Unable to delete chat session" });
        }
      }
    });
  };

  const startRenameSessionId = (id: string, title: string) => {
    setEditingSessionId(id);
    setEditingTitle(title);
  };

  const togglePinSession = async () => {
    if (!sessionId || !activeSession) return;
    await updateSessionField(sessionId, { pinned: !activeSession.pinned });
  };

  const toggleArchiveSession = async () => {
    if (!sessionId || !activeSession) return;
    await updateSessionField(sessionId, { archived: !activeSession.archived });
  };

  const toggleFavoriteSession = async () => {
    if (!sessionId || !activeSession) return;
    await updateSessionField(sessionId, { isFavorite: !activeSession.isFavorite });
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
    if (!editingSessionId || loading) {
      return;
    }

    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      return;
    }

    if (!session?.user?.id) {
      const allSessions = getGuestSessions();
      const updated = allSessions.map((s) => {
        if (s.id === editingSessionId) {
          return { ...s, title: nextTitle };
        }
        return s;
      });
      saveGuestSessions(updated);
      setEditingSessionId(null);
      setEditingTitle("");
      await fetchSessions(sessionSearch);
      setToast({ type: "success", message: "Chat renamed" });
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
    }
  };

  const cancelRenameSession = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const deleteActiveSession = async () => {
    if (!sessionId || loading) {
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Active Session",
      message: "Are you sure you want to delete this chat session?",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (!session?.user?.id) {
          const allSessions = getGuestSessions();
          const updated = allSessions.filter((s) => s.id !== sessionId);
          saveGuestSessions(updated);
          setSessionId(null);
          setMessages([getModeGreeting(activeMode, userName)]);
          setSuggestions([]);
          await fetchSessions(sessionSearch);
          setToast({ type: "success", message: "Chat session deleted" });
          return;
        }

        try {
          await axios.delete(`/api/chatbot/history?sessionId=${sessionId}`);
          setSessionOptions((prev) => prev.filter((item) => item.id !== sessionId));
          setSessionId(null);
          setMessages([getModeGreeting(activeMode, userName)]);
          setSuggestions([]);
          setToast({ type: "success", message: "Chat session deleted" });
        } catch {
          setToast({ type: "error", message: "Unable to delete chat session" });
        }
      }
    });
  };

  const refreshCartFromServer = async () => {
    try {
      const isGuest = !session?.user?.id;
      const endpoint = isGuest ? "/api/guest-cart" : "/api/cart";
      const response = await axios.get(endpoint);
      if (response.data?.success) {
        let items: any[] = [];
        let cartId: string | null = null;
        let appliedCoupon: any = null;

        if (isGuest) {
          // guest-cart API returns { success: true, cart: { items: [...] }, coupon: ... }
          items = response.data.cart?.items ?? [];
          appliedCoupon = response.data.coupon ?? null;
        } else {
          // auth cart API returns { success: true, cart: { ... }, items: [...] }
          items = response.data.items ?? [];
          cartId = response.data.cart?._id ?? null;
          appliedCoupon = response.data.cart?.coupon ?? null;
        }

        // Normalize coupon
        let normalizedCoupon: AppliedCoupon | null = null;
        if (appliedCoupon) {
          const discountValue = appliedCoupon.discountValue ?? appliedCoupon.discount ?? 0;
          if (discountValue > 0) {
            normalizedCoupon = {
              code: appliedCoupon.code || "",
              discountValue: discountValue,
              type: (appliedCoupon.discountType || appliedCoupon.type || "").toLowerCase() === "percentage" ? "percentage" : "flat",
              maxDiscount: appliedCoupon.maxDiscountAmount ?? appliedCoupon.maxDiscount,
              minCartValue: appliedCoupon.minCartValue,
            };
          }
        }

        dispatch(
          setCart({
            items,
            cartId,
            isGuest,
            appliedCoupon: normalizedCoupon,
          })
        );
      }
    } catch (err) {
      console.warn("Failed to refresh cart in chatbot:", err);
    }
  };

  const handleUpdateCart = async (variantId: string, currentQty: number, nextQty: number, cartItemId?: string) => {
    try {
      const isGuest = !session?.user?.id;
      if (isGuest) {
        if (currentQty === 0) {
          await addGuestCartApi(variantId, nextQty);
        } else {
          await updateGuestCartApi(variantId, nextQty);
        }
      } else {
        if (currentQty === 0) {
          await addToCartApi(variantId, nextQty);
        } else {
          if (nextQty === 0) {
            if (cartItemId) {
              await removeFromCartApi(cartItemId);
            }
          } else {
            if (cartItemId) {
              await updateCartQuantityApi(cartItemId, nextQty);
            }
          }
        }
      }
      await refreshCartFromServer();
      setToast({
        type: "success",
        message: nextQty === 0 ? "Item removed from cart" : "Cart updated successfully!",
      });
    } catch (err: any) {
      console.error("Cart update error:", err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to update cart.",
      });
    }
  };

  const sendMessage = async (textToSend?: string, isRegenerate = false) => {
    let finalMessage = (textToSend ?? input).trim();
    
    if (isRegenerate) {
      // For regeneration, find the last user message to resend
      let lastUserMsgIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          lastUserMsgIndex = i;
          break;
        }
      }
      if (lastUserMsgIndex !== -1) {
        finalMessage = messages[lastUserMsgIndex].content;
      }
    }

    if (!finalMessage || loading) {
      return;
    }

    // Handle /clear command locally
    if (finalMessage === "/clear" && !isRegenerate) {
      setMessages([]);
      setSuggestions([]);
      setInput("");
      setToast({ type: "success", message: "Chat cleared" });
      return;
    }

    let nextMessages: Message[];
    if (isRegenerate) {
      // Slice messages up to but excluding the last assistant response
      const lastAssistantIndex = messages.map(m => m.role).lastIndexOf("assistant");
      if (lastAssistantIndex !== -1) {
        nextMessages = messages.slice(0, lastAssistantIndex);
      } else {
        nextMessages = [...messages];
      }
    } else {
      nextMessages = [
        ...messages,
        { role: "user", content: finalMessage },
      ];
    }

    const pendingMessages: Message[] = [
      ...nextMessages,
      { role: "assistant", content: "" },
    ];

    setMessages(pendingMessages);
    setSuggestions([]);
    setLastUserPrompt(finalMessage);
    if (!isRegenerate) {
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "38px";
      setAttachments([]);
    }
    setLoading(true);
    setAgentStatus("Thinking...");

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
          mode: activeMode,
          preferredModel: chatbotSettings.preferredModel,
          settings: chatbotSettings,
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
        status?: string;
      }) => {
        if (packet.type === "progress" && typeof packet.status === "string") {
          setAgentStatus(packet.status);
        }

        if (packet.type === "chunk" && typeof packet.content === "string") {
          setAgentStatus("");
          appendAssistantChunk(packet.content);
        }

        if (packet.type === "done") {
          if (typeof packet.sessionId === "string" && packet.sessionId.trim()) {
            setSessionId(packet.sessionId);
          }
          if (Array.isArray(packet.suggestions)) {
            setSuggestions(packet.suggestions.slice(0, 3));
          }
          if (Array.isArray((packet as any).products)) {
            const returnedProducts = (packet as any).products;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (updated[lastIndex].role === "assistant") {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  products: returnedProducts,
                };
              }
              return updated;
            });
          }

          // Sync guest cookies
          const isGuest = !session?.user?.id;
          if (isGuest) {
            const returnedGuestCart = (packet as any).guestCart;
            const returnedGuestCoupon = (packet as any).guestCoupon;
            if (returnedGuestCart !== undefined || returnedGuestCoupon !== undefined) {
              axios.put("/api/guest-cart", {
                items: returnedGuestCart,
                coupon: returnedGuestCoupon,
              }).then(() => refreshCartFromServer()).catch(console.error);
            }
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
      await refreshCartFromServer();
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
          mode: activeMode,
          settings: chatbotSettings,
        });

        if (fallbackResponse.data?.success) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.role === "assistant") {
              updated[lastIndex] = {
                role: "assistant",
                content: fallbackResponse.data.reply,
                products: fallbackResponse.data.products,
              };
              return updated;
            }
            return [
              ...updated,
              { role: "assistant", content: fallbackResponse.data.reply, products: fallbackResponse.data.products },
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
          // Sync guest cookies for fallback non-stream POST
          const isGuest = !session?.user?.id;
          if (isGuest) {
            const returnedGuestCart = fallbackResponse.data.guestCart;
            const returnedGuestCoupon = fallbackResponse.data.guestCoupon;
            if (returnedGuestCart !== undefined || returnedGuestCoupon !== undefined) {
              await axios.put("/api/guest-cart", {
                items: returnedGuestCart,
                coupon: returnedGuestCoupon,
              });
            }
          }
          await refreshCartFromServer();
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
      setAgentStatus("");
      await refreshCartFromServer();

      if (!session?.user?.id && sessionId) {
        setMessages((currentMessages) => {
          const allSessions = getGuestSessions();
          const updatedSessions = allSessions.map((s) => {
            if (s.id === sessionId) {
              let title = s.title;
              if (title === "Untitled chat") {
                title = finalMessage.slice(0, 80);
              }
              return {
                ...s,
                title,
                messages: currentMessages,
                updatedAt: new Date().toISOString(),
              };
            }
            return s;
          });
          saveGuestSessions(updatedSessions);
          return currentMessages;
        });
        fetchSessions(sessionSearch).catch(() => undefined);
      }
    }
  };

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const renderMessageContent = (content: string) => {
    // If markdown is disabled, render plain text
    if (!chatbotSettings.markdownEnabled) {
      return <span>{content}</span>;
    }

    const systemActionRegex = /\*\(System Executed Actions:\s*([\s\S]*?)\)\*/;
    const match = content.match(systemActionRegex);
    
    if (!match) {
      return <span>{content}</span>;
    }

    const actionsText = match[1];
    const textBefore = content.split(match[0])[0] || "";
    const textAfter = content.split(match[0])[1] || "";

    // Split actions by comma or newline
    const actions = actionsText
      .split(/[,\n]/)
      .map((a) => a.trim())
      .filter(Boolean);

    return (
      <div className="space-y-3 w-full">
        {textBefore && <div className="whitespace-pre-wrap">{textBefore}</div>}
        
        <details className="group bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-xl shadow-lg border border-emerald-500/30 overflow-hidden relative my-2 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none focus:outline-none">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">
                Snapcart AI Agent Engine
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-bold transition-transform group-open:rotate-180">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>

          <div className="px-4 pb-4 border-t border-emerald-800/30 pt-3">
            <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              System Execution Tasks
            </h4>
            
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-emerald-100/90 animate-fadeIn">
                  <svg
                    className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{action}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-emerald-800/40 flex items-center justify-between text-[10px] text-emerald-400/80 font-medium">
              <span>Status: Executed Successfully</span>
              <span>Agent ID: SC-909</span>
            </div>
          </div>
        </details>

        {textAfter && <div className="whitespace-pre-wrap">{textAfter}</div>}
      </div>
    );
  };

  return (
    <>
      {isPanelMounted ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`fixed bg-white border border-gray-200/80 shadow-2xl z-[90] flex overflow-hidden transition-all duration-200 ease-out ${
            themes[activeTheme].borderLight
          } ${
            themes[activeTheme].accentGlow
          } ${
            isFullscreen
              ? "inset-0 w-screen h-dvh max-h-dvh rounded-none flex-row"
              : "bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] h-[645px] max-h-[85vh] rounded-2xl flex-col"
          } ${
            isPanelVisible
              ? "opacity-100 translate-y-0 scale-100"
              : isFullscreen
                ? "opacity-0 scale-[0.98]"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
          }`}
        >
          {/* Drag and Drop Overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-600/10 backdrop-blur-[2px] z-[110] border-2 border-dashed border-emerald-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center pointer-events-none"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10 animate-bounce">
                  <Paperclip className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-sm font-black text-emerald-800">Drop files to attach</h3>
                <p className="text-xs text-emerald-600/80 mt-1">Images, documents, PDFs, or spreadsheets</p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Chat History Sidebar / Drawer (on left) */}
          <motion.div
            initial={false}
            animate={
              isFullscreen
                ? {
                    width: sidebarOpen ? 280 : 0,
                    opacity: sidebarOpen ? 1 : 0,
                    x: 0,
                  }
                : {
                    width: 260,
                    opacity: 1,
                    x: showHistoryDrawer ? 0 : -260,
                  }
            }
            transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
            style={{ originX: 0 }}
            className={`flex-shrink-0 flex flex-col border-r border-gray-250 bg-slate-50 overflow-hidden h-full z-30 ${
              isFullscreen ? "relative" : "absolute bottom-0 left-0 top-[53px] z-[40]"
            }`}
          >
            <div 
              style={{ width: isFullscreen ? 280 : 260, flexShrink: 0 }}
              className="p-3.5 flex flex-col h-full bg-slate-50 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider select-none">
                  Chat History
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isFullscreen) {
                      setSidebarOpen(false);
                      saveChatbotSetting("sidebarOpen", false);
                    } else {
                      setShowHistoryDrawer(false);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-slate-200/50 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  startNewChat();
                  if (!isFullscreen) {
                    setShowHistoryDrawer(false);
                  }
                }}
                className={`w-full text-xs py-2 px-3 mb-3 rounded-xl border font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${themes[activeTheme].bgLight} ${themes[activeTheme].borderHighlight} ${themes[activeTheme].textDark}`}
              >
                <Pencil className="w-3 h-3" />
                New Chat Session
              </button>

              <input
                ref={sessionSearchInputRef}
                type="text"
                value={sessionSearch}
                onChange={(event) => setSessionSearch(event.target.value)}
                placeholder="Search chats..."
                className={`w-full text-xs rounded-xl border border-gray-200 px-3 py-2 outline-none mb-3 bg-white focus:${themes[activeTheme].borderHighlight} focus:ring-1 focus:ring-slate-500/20 transition-all`}
              />

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mb-3 border-b border-gray-100 pb-2 overflow-x-auto no-scrollbar">
                {[
                  { id: "active", label: "All", icon: Bot },
                  { id: "pinned", label: "Pinned", icon: Pin },
                  { id: "favorites", label: "Favs", icon: Heart },
                  { id: "archived", label: "Archived", icon: Archive },
                ].map((flt) => {
                  const Icon = flt.icon;
                  const isActive = historyFilter === flt.id;
                  return (
                    <button
                      type="button"
                      key={flt.id}
                      onClick={() => setHistoryFilter(flt.id as any)}
                      className={`text-[9px] font-extrabold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 select-none ${
                        isActive
                          ? `${themes[activeTheme].bg} border-transparent text-white shadow-sm`
                          : "bg-white border-gray-150 text-gray-500 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{flt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 snapcart-scrollbar">
                {sessionOptions.length === 0 ? (
                  <div className="text-[11px] text-gray-400 text-center py-6 select-none font-medium">
                    No previous chats.
                  </div>
                ) : (
                  sessionOptions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        switchSession(item.id);
                        if (!isFullscreen) {
                          setShowHistoryDrawer(false);
                        }
                      }}
                      className={`group relative text-xs rounded-xl p-2.5 cursor-pointer transition-all border flex items-center justify-between ${
                        sessionId === item.id
                          ? `${themes[activeTheme].bgLight} ${themes[activeTheme].borderHighlight} ${themes[activeTheme].textDark} font-bold shadow-sm`
                          : "bg-white border-gray-100 text-gray-600 hover:bg-slate-100/50 hover:text-gray-800"
                      }`}
                    >
                      {editingSessionId === item.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 text-[11px] rounded border border-gray-300 px-1 py-0.5 outline-none font-normal"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveSessionTitle();
                              if (e.key === "Escape") cancelRenameSession();
                            }}
                            autoFocus
                          />
                          <button onClick={saveSessionTitle} className="text-green-600 p-0.5 hover:bg-green-150 rounded cursor-pointer">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelRenameSession} className="text-gray-400 p-0.5 hover:bg-gray-100 rounded cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 overflow-hidden w-[80%] select-none">
                            {item.pinned ? (
                              <Pin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Bot className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="truncate block leading-tight">{item.title}</span>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all duration-150 absolute right-1.5 top-1/2 -translate-y-1/2 bg-gradient-to-l from-slate-50 via-slate-50 to-transparent pl-4 py-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSessionField(item.id, { pinned: !item.pinned });
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
                              title={item.pinned ? "Unpin" : "Pin"}
                            >
                              {item.pinned ? (
                                <PinOff className="w-3 h-3 text-red-400" />
                              ) : (
                                <Pin className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSessionField(item.id, { isFavorite: !item.isFavorite });
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
                              title={item.isFavorite ? "Remove favorite" : "Add to favorites"}
                            >
                              <Star className={`w-3 h-3 ${item.isFavorite ? "text-amber-500 fill-amber-500" : "text-gray-400"}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSessionField(item.id, { archived: !item.archived });
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
                              title={item.archived ? "Unarchive" : "Archive"}
                            >
                              <Archive className={`w-3 h-3 ${item.archived ? "text-indigo-500" : "text-gray-400"}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateSession(item.id);
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
                              title="Duplicate"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenameSessionId(item.id, item.title);
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
                              title="Rename"
                            >
                              <Pencil className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSessionId(item.id);
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 text-red-500 hover:text-red-700 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Main Chat Workspace (takes remaining flex space or full container width) */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <div
              className={`bg-slate-900 text-white flex items-center justify-between shadow-md border-b border-slate-800 ${isFullscreen ? "px-5 py-4" : "px-4 py-3"}`}
            >
              <div className="flex items-center gap-2">
                {chatbotSettings.chatHistoryEnabled && (
                <button
                  onClick={() => {
                    if (isFullscreen) {
                      setSidebarOpen(!sidebarOpen);
                      saveChatbotSetting("sidebarOpen", !sidebarOpen);
                    } else {
                      setShowHistoryDrawer(!showHistoryDrawer);
                    }
                  }}
                  className={`rounded-full p-1.5 hover:bg-white/20 transition-colors relative flex items-center justify-center cursor-pointer ${
                    (isFullscreen ? sidebarOpen : showHistoryDrawer) ? "bg-white/35" : ""
                  }`}
                  aria-label="Toggle history"
                  title="Chat History"
                  type="button"
                >
                  {isFullscreen ? (
                    <Menu className="w-4 h-4" />
                  ) : (
                    <History className="w-4 h-4" />
                  )}
                </button>
                )}
                <Bot className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold leading-tight">Snapcart AI</p>
                    <select
                      value={activeMode}
                      onChange={(e) => setActiveMode(e.target.value as any)}
                      className="bg-black/20 border border-white/20 rounded-lg px-2 py-0.5 text-[11px] font-bold text-white outline-none cursor-pointer hover:bg-black/35 transition-all shadow-sm"
                    >
                      <option value="agent" className="bg-slate-800 text-white font-semibold">🤖 Agent</option>
                      <option value="normal" className="bg-slate-800 text-white font-semibold">💬 Q&A</option>
                      <option value="expert" className="bg-slate-800 text-white font-semibold">🛍️ Shop Expert</option>
                    </select>
                  </div>
                  <p className="text-xs text-white/80 font-medium">
                    Role: {roleLabelMap[role] || "User"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-full p-1 hover:bg-white/20 transition-colors disabled:opacity-50"
                  aria-label="Retry last message"
                  type="button"
                  disabled={!lastUserPrompt || loading}
                  onClick={retryLastMessage}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`rounded-full p-1 hover:bg-white/20 transition-colors relative flex items-center justify-center cursor-pointer ${
                    showSettings ? "bg-white/30 text-white" : "text-white"
                  }`}
                  aria-label="Settings"
                  title="Settings"
                  type="button"
                >
                  <Settings className={`w-4 h-4 ${showSettings ? "animate-spin-slow" : ""}`} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="rounded-full p-1 hover:bg-white/20 transition-colors"
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
                  className="rounded-full p-1 hover:bg-white/20 transition-colors"
                  aria-label="Clear chat"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={closeChatbot}
                  className="rounded-full p-1 hover:bg-white/20 transition-colors"
                  aria-label="Close chatbot"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>



          {/* Sliding Drawer Backdrop Overlay */}
          {showHistoryDrawer && (
            <div
              onClick={() => setShowHistoryDrawer(false)}
              className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-[35] transition-opacity duration-300"
            />
          )}

          {toast && (
            <div className={`absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg border text-xs font-semibold z-[95] backdrop-blur-md transition-all duration-300 animate-bounce bg-emerald-50/95 border-emerald-250 text-emerald-800`}>
              {toast.message}
            </div>
          )}

          {/* Quick Actions Toolbar */}
          <div 
            className="flex gap-2 overflow-x-auto py-2.5 px-3 bg-white border-b border-gray-100 no-scrollbar scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              type="button"
              onClick={() => sendMessage("Reorder my last delivery and apply coupon")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-700 hover:from-emerald-500 hover:to-teal-500 hover:text-white hover:border-transparent hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm cursor-pointer"
            >
              🔄 Reorder & Coupon
            </button>
            <button
              type="button"
              onClick={() => sendMessage("Optimize my budget for current cart items")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-700 hover:from-emerald-500 hover:to-teal-500 hover:text-white hover:border-transparent hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm cursor-pointer"
            >
              💰 Optimize Budget
            </button>
            <button
              type="button"
              onClick={() => sendMessage("Show my spend analytics dashboard")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-700 hover:from-emerald-500 hover:to-teal-500 hover:text-white hover:border-transparent hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm cursor-pointer"
            >
              📊 Spend Analytics
            </button>
            <button
              type="button"
              onClick={() => sendMessage("Scan my current cart health for diet compatibility")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-700 hover:from-emerald-500 hover:to-teal-500 hover:text-white hover:border-transparent hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm cursor-pointer"
            >
              🥗 Diet Scan
            </button>
          </div>

          <div
            ref={messagesScrollRef}
            className={`flex-1 bg-slate-50 space-y-3 overflow-y-auto snapcart-scrollbar ${isFullscreen ? "p-5" : "p-3"}`}
          >
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <span className="text-xs text-gray-500 font-medium tracking-wide">
                  Loading chat session...
                </span>
              </div>
            ) : (
              <div
                className={`${
                  isFullscreen
                    ? `${chatbotSettings.chatWidth === "narrow" ? "max-w-3xl" : chatbotSettings.chatWidth === "wide" ? "max-w-7xl" : "max-w-5xl"} mx-auto`
                    : ""
                } ${chatbotSettings.density === "compact" ? "space-y-1.5" : chatbotSettings.density === "spacious" ? "space-y-5" : "space-y-3"}`}
              >
              {messages.map((msg, index) => (
                <div key={`${msg.role}-${index}`} className={`flex flex-col gap-2 ${chatbotSettings.animations ? "animate-fadeIn" : ""}`}>
                  <div
                    className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white bg-gradient-to-tr ${themes[activeTheme].gradient} shadow-md`}>
                        {activeMode === "agent" ? (
                          <Bot className="w-4 h-4" />
                        ) : activeMode === "expert" ? (
                          <Sparkles className="w-4 h-4 text-emerald-100" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    {(() => {
                      const isAssistantPending =
                        loading &&
                        msg.role === "assistant" &&
                        index === messages.length - 1 &&
                        !msg.content.trim();

                      const primaryLang = chatbotSettings.primaryLanguage || "en";
                      const secondaryLang = chatbotSettings.secondaryLanguage || "hi";
                      const currentActiveLang = msg.activeLang || primaryLang;
                      const hasTranslationLoaded = Boolean(msg.activeLang && msg.translatedContent && msg.translatedContent[msg.activeLang]);
                      const activeContent = (hasTranslationLoaded && msg.translatedContent && msg.activeLang)
                        ? (msg.translatedContent[msg.activeLang] as string)
                        : msg.content;

                      return (
                        <div
                          className={`${
                            isFullscreen
                              ? `max-w-[70%] ${chatbotSettings.fontSize === "small" ? "text-sm" : chatbotSettings.fontSize === "large" ? "text-lg" : "text-[15px]"} leading-relaxed px-4 py-3`
                              : `max-w-[80%] ${chatbotSettings.fontSize === "small" ? "text-xs" : chatbotSettings.fontSize === "large" ? "text-base" : "text-sm"} px-3.5 py-2.5`
                          } ${chatbotSettings.bubbleStyle === "sharp" ? "rounded-lg" : chatbotSettings.bubbleStyle === "modern" ? "rounded-xl" : "rounded-2xl"} whitespace-pre-wrap ${
                            msg.role === "user"
                              ? `bg-gradient-to-br ${themes[activeTheme].gradient} text-white ${chatbotSettings.bubbleStyle === "modern" ? "rounded-br-sm" : "rounded-br-none"} shadow-md ${themes[activeTheme].accentGlow} border-0`
                              : `bg-white text-gray-800 border ${themes[activeTheme].borderLight} ${chatbotSettings.bubbleStyle === "modern" ? "rounded-bl-sm" : "rounded-bl-none"} shadow-sm`
                          }`}
                        >
                          {isAssistantPending ? (
                            <div className="inline-flex items-center gap-2 text-emerald-850">
                              <span className="font-semibold text-xs tracking-wide animate-pulse">
                                {agentStatus || getChatbotTypingLabel(
                                  lastUserPrompt,
                                  role,
                                  Boolean(productContext),
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:120ms]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:240ms]" />
                              </span>
                            </div>
                          ) : (
                            renderMessageContent(activeContent)
                          )}

                          {msg.role === "assistant" && msg.content.trim() ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100/60 pt-2.5 justify-start sm:justify-end select-none">
                              {/* Translate Dropdown */}
                              <div className="inline-flex items-center h-7 rounded-full border border-gray-200 bg-white/95 px-2 text-[11px] text-gray-700 hover:bg-gray-50 transition-all shadow-sm relative">
                                <Languages className={`w-3.5 h-3.5 text-gray-500 mr-1 flex-shrink-0 ${msg.isTranslating ? "animate-spin text-emerald-600" : ""}`} />
                                <select
                                  disabled={msg.isTranslating}
                                  value={msg.activeLang || "original"}
                                  onChange={(e) => handleTranslateMessage(index, e.target.value)}
                                  className="bg-transparent border-none text-gray-700 text-[11px] font-bold focus:outline-none cursor-pointer pr-1 py-0 disabled:opacity-50"
                                >
                                  <option value="original">Original Response</option>
                                  <option value="en">English</option>
                                  <option value="hi">Hindi (हिन्दी)</option>
                                  <option value="hinglish">Hinglish</option>
                                  <option value="bn">Bengali (বাংলা)</option>
                                  <option value="mr">Marathi (मराठी)</option>
                                  <option value="ta">Tamil (தமிழ்)</option>
                                  <option value="te">Telugu (తెలుగు)</option>
                                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                                  <option value="ml">Malayalam (മലയാളം)</option>
                                  <option value="gu">Gujarati (ગુજરાતી)</option>
                                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                                  <option value="ur">Urdu (اردو)</option>
                                  <option value="or">Odia (ଓଡ଼ିଆ)</option>
                                  <option value="as">Assamese (অસમীয়া)</option>
                                </select>
                              </div>

                              {/* Play Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSpeechForMessage(
                                    `assistant-${index}`,
                                    activeContent,
                                  )
                                }
                                className="inline-flex items-center h-7 gap-1 rounded-full border border-gray-200 bg-white/95 px-2.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-all shadow-sm cursor-pointer font-bold"
                                title={
                                  speakingMessageId === `assistant-${index}` &&
                                  !isSpeechPaused
                                    ? "Pause audio"
                                    : "Play audio"
                                }
                              >
                                {speakingMessageId === `assistant-${index}` &&
                                !isSpeechPaused ? (
                                  <Pause className="w-3 h-3 text-red-500" />
                                ) : (
                                  <Play className="w-3 h-3 text-green-600" />
                                )}
                                <span>
                                  {speakingMessageId === `assistant-${index}` &&
                                  !isSpeechPaused
                                    ? "Pause"
                                    : "Listen"}
                                </span>
                              </button>

                              {/* Copy Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(activeContent);
                                  setToast({
                                    type: "success",
                                    message: "Response copied to clipboard!",
                                  });
                                }}
                                className="inline-flex items-center h-7 gap-1 rounded-full border border-gray-200 bg-white/95 px-2.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-all shadow-sm cursor-pointer font-bold active:scale-95"
                                title="Copy response"
                              >
                                <Copy className="w-3 h-3 text-blue-500" />
                                <span>Copy</span>
                              </button>

                              {/* Regenerate Button */}
                              {index === messages.map((m) => m.role).lastIndexOf("assistant") && (
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => sendMessage(undefined, true)}
                                  className="inline-flex items-center h-7 gap-1 rounded-full border border-gray-200 bg-white/95 px-2.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-55 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer font-bold active:scale-95"
                                  title="Regenerate response"
                                >
                                  <RotateCcw className="w-3 h-3 text-emerald-600" />
                                  <span>Regenerate</span>
                                </button>
                              )}

                              {/* Speed Selector */}
                              <div className="inline-flex items-center h-7 rounded-full border border-gray-200 bg-white/95 px-2 text-[11px] text-gray-700 shadow-sm">
                                <select
                                  value={speechRate}
                                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                  className="bg-transparent border-none text-gray-600 text-[11px] font-bold focus:outline-none cursor-pointer pr-1"
                                  title="Playback speed"
                                >
                                  <option value="0.5">0.5x</option>
                                  <option value="1">1.0x</option>
                                  <option value="1.5">1.5x</option>
                                  <option value="2">2.0x</option>
                                </select>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    {msg.role === "user" && (
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white bg-gradient-to-br ${themes[activeTheme].gradient} shadow-md overflow-hidden font-extrabold text-xs uppercase border border-white/20 select-none`}>
                        {session?.user?.image ? (
                          <img src={session.user.image} alt="User avatar" className="w-full h-full object-cover" />
                        ) : userName ? (
                          userName.slice(0, 2)
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Developer Debug Bar */}
                  {chatbotSettings.developerMode && msg.role === "assistant" && msg.content.trim() && (
                    <div className="flex items-center gap-3 px-2 py-1 ml-10 text-[9px] font-mono text-gray-400 select-none">
                      <span>🔧 model: {(msg as any).model || "gemini-flash"}</span>
                      <span>•</span>
                      <span>tokens: ~{Math.round(msg.content.length / 4)}</span>
                      <span>•</span>
                      <span>session: {sessionId ? sessionId.slice(0, 8) + "…" : "guest"}</span>
                    </div>
                  )}

                  {/* Message Timestamp */}
                  {chatbotSettings.messageTimestamps && msg.content.trim() && (
                    <div className={`text-[9px] text-gray-400 select-none px-1 ${msg.role === "user" ? "text-right mr-10" : "ml-10"}`}>
                      {(() => {
                        const now = new Date();
                        const h = now.getHours();
                        const m = now.getMinutes().toString().padStart(2, "0");
                        if (chatbotSettings.timeFormat === "24h") return `${h.toString().padStart(2, "0")}:${m}`;
                        const ampm = h >= 12 ? "PM" : "AM";
                        const h12 = h % 12 || 12;
                        return `${h12}:${m} ${ampm}`;
                      })()}
                    </div>
                  )}

                  {/* Product Carousel Row */}
                  {msg.role === "assistant" && msg.products && msg.products.length > 0 && (
                    <div className="w-full py-1 animate-fadeIn">
                      <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 snapcart-scrollbar no-scrollbar scroll-smooth">
                        {msg.products.map((prod: any) => (
                          <ChatProductCard
                            key={prod._id}
                            product={prod}
                            cartItems={cartItems}
                            session={session}
                            onUpdateCart={handleUpdateCart}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>

          {chatbotSettings.smartSuggestions && suggestions.length > 0 ? (
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
            className={`border-t border-gray-200 bg-white relative ${
              isFullscreen ? "sticky bottom-0 z-[2] p-5" : "p-3"
            }`}
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            {/* Slash commands autocomplete dropdown */}
            {showSlashMenu && filteredCommands.length > 0 && (
              <div className="absolute bottom-[75px] left-4 right-4 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-w-md mx-auto p-1.5 space-y-0.5">
                <div className="text-[10px] font-extrabold text-emerald-850 uppercase px-2.5 py-1 tracking-wider border-b border-gray-100 select-none">
                  Slash Actions
                </div>
                {filteredCommands.map((cmd, idx) => {
                  const isSelected = selectedSlashIndex === idx;
                  return (
                    <div
                      key={cmd.command}
                      onClick={() => {
                        setInput(cmd.command);
                        setShowSlashMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer select-none transition-all ${
                        isSelected
                          ? `${themes[activeTheme].bgLight} ${themes[activeTheme].textDark} font-bold`
                          : "text-gray-650 hover:bg-slate-100/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{(cmd as any).icon || "⚡"}</span>
                        <span className={`font-mono ${themes[activeTheme].text} font-extrabold`}>{cmd.command}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium max-w-[150px] truncate">{cmd.description}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Attachments preview list */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-gray-100 max-w-5xl mx-auto">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 rounded-xl p-1 pr-2 text-[11px] max-w-[155px] relative group"
                  >
                    {file.url ? (
                      <img src={file.url} className="w-6 h-6 rounded object-cover flex-shrink-0" alt="Preview" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1 font-semibold text-gray-750">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500 rounded-full hover:bg-slate-200/50 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className={
                isFullscreen
                  ? "max-w-5xl mx-auto flex items-center gap-2"
                  : "flex items-center gap-2"
              }
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl border border-gray-300 bg-slate-50 text-gray-500 hover:bg-slate-100 transition-all shadow-sm flex items-center justify-center cursor-pointer select-none ${
                    isFullscreen ? "p-3" : "p-2"
                  }`}
                  title="Attach images, PDFs, lists, or documents"
                >
                  <Paperclip className="w-4 h-4 text-gray-500" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      const newAttachments = files.map((f) => ({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
                      }));
                      setAttachments((prev) => [...prev, ...newAttachments]);
                    }
                    // Reset so the same file can be re-selected
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>

              {/* Camera / Scan button */}
              <button
                type="button"
                onClick={() => {
                  const camInput = document.createElement("input");
                  camInput.type = "file";
                  camInput.accept = "image/*";
                  camInput.capture = "environment";
                  camInput.onchange = (ev) => {
                    const files = Array.from((ev.target as HTMLInputElement).files || []);
                    if (files.length > 0) {
                      const newAttachments = files.map((f) => ({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        url: URL.createObjectURL(f),
                      }));
                      setAttachments((prev) => [...prev, ...newAttachments]);
                    }
                  };
                  camInput.click();
                }}
                className={`rounded-xl border border-gray-300 bg-slate-50 text-gray-500 hover:bg-slate-100 transition-all shadow-sm flex items-center justify-center cursor-pointer select-none ${
                  isFullscreen ? "p-3" : "p-2"
                }`}
                title="Scan product or receipt with camera"
              >
                <Camera className="w-4 h-4 text-gray-500" />
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustInputHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder={historyLoading ? "Loading chat history..." : modePlaceholders[activeMode]}
                disabled={historyLoading}
                className={`flex-1 rounded-xl border border-gray-300 outline-none focus:ring-2 ${themes[activeTheme].ring} focus:border-transparent transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed resize-none max-h-[160px] py-2 px-3 text-sm no-scrollbar`}
                style={{ height: "38px" }}
              />

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                disabled={historyLoading}
                className={`rounded-xl border transition-all shadow-sm flex items-center justify-center cursor-pointer ${
                  isRecording
                    ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                    : "bg-slate-50 border-gray-300 text-gray-500 hover:bg-slate-100"
                } ${isFullscreen ? "p-3" : "p-2"}`}
                aria-label="Voice typing"
                title="Voice typing"
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 text-red-600" />
                ) : (
                  <Mic className="w-4 h-4 text-gray-500" />
                )}
              </button>
              <button
                type={loading ? "button" : "submit"}
                onClick={loading ? stopGenerating : undefined}
                disabled={historyLoading || (!loading && !input.trim())}
                className={`rounded-xl bg-gradient-to-r ${themes[activeTheme].gradient} ${themes[activeTheme].hoverGradient} text-white disabled:opacity-50 active:scale-95 transition-all shadow-sm flex items-center justify-center ${
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

          {/* Custom Confirmation Modal */}
          <AnimatePresence>
            {confirmDialog.isOpen && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="bg-white rounded-2xl p-5 max-w-[280px] w-full border border-gray-150 shadow-2xl flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                    <Trash2 className="w-6 h-6 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-black text-gray-800 mb-1">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-5 leading-normal">
                    {confirmDialog.message}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                      className="flex-1 py-2 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDialog.onConfirm}
                      className="flex-1 py-2 px-3 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 active:scale-95 transition-all shadow-sm shadow-red-550/15 cursor-pointer"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Settings Panel Overlay */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className={`absolute inset-0 bg-white z-[99] flex flex-col overflow-hidden text-gray-700 ${isFullscreen ? "rounded-none" : "rounded-2xl"}`}
              >
                {/* Settings Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 animate-spin-slow" />
                    <h3 className="font-bold text-sm tracking-wide">AI Assistant Preferences</h3>
                    {settingsSaved && (
                      <span className="text-[10px] font-bold text-emerald-400 animate-pulse ml-1 select-none">✓ Saved</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (session?.user?.id) {
                            const res = await axios.delete("/api/chatbot/settings");
                            if (res.data?.success && res.data?.settings) {
                              setChatbotSettings(res.data.settings);
                              setToast({ type: "success", message: "Restored default settings" });
                            }
                          } else {
                            localStorage.removeItem("snapcart_chatbot_settings");
                            setChatbotSettings(DEFAULT_SETTINGS);
                            setToast({ type: "success", message: "Restored default settings" });
                          }
                        } catch {
                          setToast({ type: "error", message: "Failed to reset settings" });
                        }
                      }}
                      className="text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-all select-none cursor-pointer"
                      title="Restore Default Settings"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Settings Body: Split Panel */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Tabs Nav */}
                  <div className="w-[125px] sm:w-[155px] border-r border-gray-100 bg-slate-50/50 overflow-y-auto p-2 space-y-1 select-none no-scrollbar flex-shrink-0">
                    {[
                      { id: "general", label: "General", icon: Languages },
                      { id: "appearance", label: "Appearance", icon: Sparkles },
                      { id: "chat", label: "Chat Logic", icon: Bot },
                      { id: "ai", label: "AI Config", icon: User },
                      { id: "voice", label: "Voice", icon: Mic },
                      { id: "notifications", label: "Notifications", icon: ArrowDown },
                      { id: "privacy", label: "Privacy", icon: Archive },
                      { id: "advanced", label: "Advanced", icon: Settings },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeSettingsTab === tab.id;
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          onClick={() => setActiveSettingsTab(tab.id as any)}
                          className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-xl text-left text-[11px] font-bold transition-all cursor-pointer ${
                            isActive
                              ? `bg-white border-l-4 ${themes[activeTheme].borderLeftHighlight} ${themes[activeTheme].text} shadow-sm`
                              : "text-gray-500 hover:bg-slate-100 hover:text-gray-800"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Tab Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth snapcart-scrollbar">
                    {/* General Tab */}
                    {activeSettingsTab === "general" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">General Settings</h4>
                          <p className="text-[11px] text-gray-500">Configure language options and basic interface layouts.</p>
                        </div>

                        {/* Preferred Language Selection */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Preferred Language</label>
                          <select
                            value={chatbotSettings.primaryLanguage}
                            onChange={(e) => updateSettings({ primaryLanguage: e.target.value })}
                            className={`w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 ${themes[activeTheme].ring} cursor-pointer`}
                          >
                            <option value="en">English</option>
                            <option value="hi">Hindi (हिन्दी)</option>
                            <option value="hinglish">Hinglish</option>
                            <option value="bn">Bengali (বাংলা)</option>
                            <option value="mr">Marathi (मরাठी)</option>
                            <option value="ta">Tamil (தமிழ்)</option>
                            <option value="te">Telugu (తెలుగు)</option>
                            <option value="kn">Kannada (ಕನ್ನಡ)</option>
                            <option value="ml">Malayalam (മലയാളം)</option>
                            <option value="gu">Gujarati (ગુજરાતી)</option>
                            <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                            <option value="ur">Urdu (اردو)</option>
                            <option value="or">Odia (ଓଡ଼ିଆ)</option>
                            <option value="as">Assamese (অસમীয়া)</option>
                          </select>
                        </div>

                        {/* Font Size */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Font Size</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["small", "medium", "large"] as const).map((sz) => (
                              <button
                                type="button"
                                key={sz}
                                onClick={() => updateSettings({ fontSize: sz })}
                                className={`text-xs py-2 px-2 rounded-xl border text-center font-bold capitalize transition-all cursor-pointer ${
                                  chatbotSettings.fontSize === sz
                                    ? `${themes[activeTheme].bgLight} ${themes[activeTheme].borderHighlight} ${themes[activeTheme].textDark}`
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-slate-50"
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Display Density</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["compact", "cozy", "spacious"] as const).map((ds) => (
                              <button
                                type="button"
                                key={ds}
                                onClick={() => updateSettings({ density: ds })}
                                className={`text-xs py-2 px-2 rounded-xl border text-center font-bold capitalize transition-all cursor-pointer ${
                                  chatbotSettings.density === ds
                                    ? `${themes[activeTheme].bgLight} ${themes[activeTheme].borderHighlight} ${themes[activeTheme].textDark}`
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-slate-50"
                                }`}
                              >
                                {ds}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Appearance Tab */}
                    {activeSettingsTab === "appearance" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">Appearance & Style</h4>
                          <p className="text-[11px] text-gray-500">Fine-tune the colors, borders, and animations of the chat container.</p>
                        </div>

                        {/* Accent Colors */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">Accent Highlight Color</label>
                          <div className="flex items-center gap-3 pt-1">
                            {(["emerald", "violet", "rose", "amber"] as const).map((t) => (
                              <button
                                type="button"
                                key={t}
                                onClick={() => updateSettings({ accentColor: t })}
                                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm flex items-center justify-center ${
                                  t === "emerald" ? "bg-emerald-500" :
                                  t === "violet" ? "bg-violet-500" :
                                  t === "rose" ? "bg-rose-500" : "bg-amber-500"
                                } ${
                                  chatbotSettings.accentColor === t
                                    ? "border-slate-800 scale-105"
                                    : "border-transparent"
                                }`}
                              >
                                {chatbotSettings.accentColor === t && (
                                  <Check className="w-4 h-4 text-white font-bold" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Chat Width */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Chat Viewport Width</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["narrow", "normal", "wide"] as const).map((wd) => (
                              <button
                                type="button"
                                key={wd}
                                onClick={() => updateSettings({ chatWidth: wd })}
                                className={`text-xs py-2 px-2 rounded-xl border text-center font-bold capitalize transition-all cursor-pointer ${
                                  chatbotSettings.chatWidth === wd
                                    ? `${themes[activeTheme].bgLight} ${themes[activeTheme].borderHighlight} ${themes[activeTheme].textDark}`
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-slate-50"
                                }`}
                              >
                                {wd}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bubble Style */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Message Bubble Shape</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["rounded", "sharp", "modern"] as const).map((bs) => (
                              <button
                                type="button"
                                key={bs}
                                onClick={() => updateSettings({ bubbleStyle: bs })}
                                className={`text-xs py-2 px-2 rounded-xl border text-center font-bold capitalize transition-all cursor-pointer ${
                                  chatbotSettings.bubbleStyle === bs
                                    ? `${themes[activeTheme].bgLight} ${themes[activeTheme].borderHighlight} ${themes[activeTheme].textDark}`
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-slate-50"
                                }`}
                              >
                                {bs}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Animations Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Enable UI Motion & Animations</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ animations: !chatbotSettings.animations })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.animations ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.animations ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Blur Effects Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Glassmorphism Blur Effects</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ blurEffects: !chatbotSettings.blurEffects })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.blurEffects ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.blurEffects ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Chat Tab */}
                    {activeSettingsTab === "chat" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">Chat & Input Behavior</h4>
                          <p className="text-[11px] text-gray-500">Configure key binding preferences and content presentation controls.</p>
                        </div>

                        {/* Enter to Send Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-gray-700 block">Enter Key to Send Message</span>
                            <span className="text-[10px] text-gray-400">If disabled, use Shift+Enter or click the submit icon.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateSettings({ enterToSend: !chatbotSettings.enterToSend })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.enterToSend ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.enterToSend ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Markdown Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Enable Rich Markdown Rendering</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ markdownEnabled: !chatbotSettings.markdownEnabled })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.markdownEnabled ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.markdownEnabled ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Streaming Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Stream Token Responses in Real-time</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ streamingEnabled: !chatbotSettings.streamingEnabled })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.streamingEnabled ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.streamingEnabled ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Auto scroll Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Auto Scroll on New Message</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ autoScroll: !chatbotSettings.autoScroll })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.autoScroll ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.autoScroll ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Message Timestamps Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Show Message Timestamps</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ messageTimestamps: !chatbotSettings.messageTimestamps })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.messageTimestamps ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.messageTimestamps ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Smart Suggestions Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Smart Quick Suggestions</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ smartSuggestions: !chatbotSettings.smartSuggestions })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.smartSuggestions ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.smartSuggestions ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Preferences Tab */}
                    {activeSettingsTab === "ai" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">AI Engine Parameters</h4>
                          <p className="text-[11px] text-gray-500">Fine-tune the model parameters, context limits, and base system prompt.</p>
                        </div>

                        {/* Preferred Model */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Preferred Model</label>
                          <select
                            value={chatbotSettings.preferredModel}
                            onChange={(e) => updateSettings({ preferredModel: e.target.value })}
                            className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                          >
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Analytical)</option>
                          </select>
                        </div>

                        {/* Creativity Temperature Slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">Temperature (Creativity)</span>
                            <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-gray-600">{chatbotSettings.temperature}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={chatbotSettings.temperature}
                            onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>

                        {/* Response Length */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Response Length</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["short", "medium", "detailed"] as const).map((len) => (
                              <button
                                type="button"
                                key={len}
                                onClick={() => updateSettings({ responseLength: len })}
                                className={`text-xs font-bold py-2 rounded-xl border transition-all cursor-pointer capitalize ${
                                  chatbotSettings.responseLength === len
                                    ? `${themes[activeTheme].bg} text-white border-transparent shadow-md`
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                {len === "short" ? "⚡ Short" : len === "medium" ? "📝 Medium" : "📖 Detailed"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* System Prompt Customizer */}
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-extrabold ${themes[activeTheme].textDark} uppercase tracking-wider block`}>Custom System Prompt Override</label>
                          <textarea
                            value={chatbotSettings.systemPrompt}
                            onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
                            placeholder="Add additional instructions for the AI assistant..."
                            rows={3}
                            className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Voice Tab */}
                    {activeSettingsTab === "voice" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">Voice Playback & Dictation</h4>
                          <p className="text-[11px] text-gray-500">Configure text-to-speech output speeds and voice profiles.</p>
                        </div>

                        {/* Voice Input Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Enable Voice Input (Microphone)</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ voiceInputEnabled: !chatbotSettings.voiceInputEnabled })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.voiceInputEnabled ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.voiceInputEnabled ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Voice Output Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Enable Voice Output (Speaker)</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ voiceOutputEnabled: !chatbotSettings.voiceOutputEnabled })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.voiceOutputEnabled ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.voiceOutputEnabled ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Speech Speed slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">Speaking Pace (Speed)</span>
                            <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-gray-600">{chatbotSettings.speechSpeed}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.25"
                            value={chatbotSettings.speechSpeed}
                            onChange={(e) => updateSettings({ speechSpeed: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notifications Tab */}
                    {activeSettingsTab === "notifications" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">Alerts & Notifications</h4>
                          <p className="text-[11px] text-gray-500">Configure sound effects and browser toast notifications.</p>
                        </div>

                        {/* Browser Notifications Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Send Browser Toast Alerts</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ browserNotifications: !chatbotSettings.browserNotifications })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.browserNotifications ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.browserNotifications ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Sound Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Play UI Sound Effects</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ soundEnabled: !chatbotSettings.soundEnabled })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.soundEnabled ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.soundEnabled ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Privacy Tab */}
                    {activeSettingsTab === "privacy" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">Privacy & Data</h4>
                          <p className="text-[11px] text-gray-500">Manage your history settings and session database state.</p>
                        </div>

                        {/* Chat History Switch */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="space-y-0.5 flex-1 pr-4">
                            <span className="text-xs font-bold text-gray-700 block">Record Conversation History</span>
                            <span className="text-[10px] text-gray-400 leading-normal">Save active chat sessions to your database profile.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateSettings({ chatHistoryEnabled: !chatbotSettings.chatHistoryEnabled })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none flex-shrink-0 ${
                              chatbotSettings.chatHistoryEnabled ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.chatHistoryEnabled ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Data Portability Actions */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">Data Actions</span>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages));
                                const dlAnchorElem = document.createElement("a");
                                dlAnchorElem.setAttribute("href", dataStr);
                                dlAnchorElem.setAttribute("download", `snapcart_chat_${sessionId || "guest"}.json`);
                                dlAnchorElem.click();
                                setToast({ type: "success", message: "History JSON exported" });
                              }}
                              className="text-xs font-bold text-left py-2 px-3 border border-gray-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              📥 Export Active Chat Session Data
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: "Delete All Chat History",
                                  message: "Are you sure you want to clear your entire chat session database? This will remove all previous conversations forever.",
                                  onConfirm: async () => {
                                    setConfirmDialog((p) => ({ ...p, isOpen: false }));
                                    try {
                                      await axios.delete("/api/chatbot/history");
                                      setSessionOptions([]);
                                      setSessionId(null);
                                      setMessages([getModeGreeting(activeMode, userName)]);
                                      setToast({ type: "success", message: "Deleted all chats from database" });
                                    } catch {
                                      setToast({ type: "error", message: "Deletion failed" });
                                    }
                                  }
                                });
                              }}
                              className="text-xs font-bold text-left py-2 px-3 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                            >
                              🚨 Clear Entire Conversation History
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Advanced Tab */}
                    {activeSettingsTab === "advanced" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="space-y-1 border-b border-gray-100 pb-2">
                          <h4 className="font-extrabold text-sm text-gray-800">Advanced Developer Controls</h4>
                          <p className="text-[11px] text-gray-500">Access debugging information, system diagnostics, and experimental configurations.</p>
                        </div>

                        {/* Developer Mode */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-gray-700">Developer Debug Mode</span>
                          <button
                            type="button"
                            onClick={() => updateSettings({ developerMode: !chatbotSettings.developerMode })}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                              chatbotSettings.developerMode ? themes[activeTheme].bg : "bg-gray-200"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-1 transition-transform ${chatbotSettings.developerMode ? "left-5.5" : "left-1"}`} />
                          </button>
                        </div>

                        {/* Diagnostic info cards */}
                        <div className="bg-slate-50 border border-gray-100 rounded-xl p-3.5 space-y-2 text-[10px] font-mono text-gray-500">
                          <div><span className="font-bold text-gray-700">Client Platform:</span> {typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 50) : "Server"}</div>
                          <div><span className="font-bold text-gray-700">Chatbot Version:</span> v1.5.0-production</div>
                          <div><span className="font-bold text-gray-700">Active Mode:</span> {activeMode}</div>
                          <div><span className="font-bold text-gray-700">Active Session ID:</span> {sessionId || "Guest Instance"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      ) : showLauncher && !isProductDetailsPage ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 sm:right-6 z-[90] bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white pl-4 pr-5 py-2.5 rounded-full shadow-xl hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-300 flex items-center gap-2 group border border-emerald-400/20 active:scale-95 cursor-pointer"
          aria-label="Open Snapcart AI chatbot"
          title="Ask Snapcart AI"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
          </span>
          <Sparkles className="w-4 h-4 text-emerald-100 group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-semibold text-sm tracking-wide">Ask AI</span>
        </button>
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: `
        .snapcart-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .snapcart-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .snapcart-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.25);
          border-radius: 9999px;
        }
        .snapcart-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.45);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </>
  );
}
