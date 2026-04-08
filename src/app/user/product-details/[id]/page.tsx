"use client";

import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AdvancedWishlistSheet from "@/components/AdvancedWishlistSheet";
import PriceComparisonInfo from "@/components/common/PriceComparisonInfo";
import PriceDisplay from "@/components/common/PriceDisplay";
import VariantSelector from "@/components/common/VariantSelector";
import GroceryItemCard from "@/components/GroceryItemCard";
import Navbar from "@/components/Navbar";
import ReviewSection from "@/components/ReviewSection";
import {
  addGuestCartApi,
  addToCartApi,
  fetchCartApi,
  getGuestCart,
  updateCartQuantityApi,
  updateGuestCartApi,
} from "@/hooks/cart.api";
import { calculateDiscountPercentUI } from "@/lib/client/price";
import {
  getBestDealVariant,
  getPriceRange,
  hasVariablePricing,
} from "@/lib/utils/priceUtils";
import { setCart } from "@/redux/features/cartSlice";
import { setGroceries } from "@/redux/features/grocerySlice";
import { AppDispatch, RootState } from "@/redux/store";

interface IVariant {
  _id: string;
  label: string;
  variantName?: string;
  unit: { value: number; unit: string; multiplier?: number };
  price: { mrp: number; selling: number; discountPercent?: number };
  countInStock?: number;
  isDefault?: boolean;
}

interface IGrocery {
  _id: string;
  name: string;
  description?: string;
  brand?: string;
  category: { _id: string; name: string };
  images?: Array<{ url: string; publicId: string }>;
  variants: IVariant[];
  badges?: { isBestSeller?: boolean; isNew?: boolean };
}

const shimmer =
  "data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g'%3E%3Cstop stop-color='%23f0fdf4' offset='20%25'/%3E%3Cstop stop-color='%23dcfce7' offset='50%25'/%3E%3Cstop stop-color='%23f0fdf4' offset='70%25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='%23f8fafc'/%3E%3Crect id='r' width='400' height='400' fill='url(%23g)'/%3E%3Canimate xlink:href='%23r' attributeName='x' from='-400' to='400' dur='1s' repeatCount='indefinite'/%3E%3C/svg%3E";

const getProductAiTypingLabel = (question: string) => {
  const text = question.toLowerCase();

  if (/(variant|size|pack|kg|gm|ml)/.test(text)) {
    return "Reviewing product variants...";
  }

  if (/(compare|alternative|better|best)/.test(text)) {
    return "Comparing product options...";
  }

  if (/(storage|fresh|freshness|expiry|shelf)/.test(text)) {
    return "Checking freshness & storage details...";
  }

  if (/(price|offer|discount|value)/.test(text)) {
    return "Analyzing price-value details...";
  }

  return "AI is preparing your answer...";
};

const generateTempCartItemId = () => {
  const randomUUIDFn = globalThis.crypto?.randomUUID;
  if (typeof randomUUIDFn === "function") {
    return randomUUIDFn.call(globalThis.crypto);
  }

  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const ProductDetailsPage = () => {
  const cloudTtsEnabled = process.env.NEXT_PUBLIC_ENABLE_NEURAL_TTS === "true";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { cartItems, appliedCoupon } = useSelector(
    (state: RootState) => state.cart,
  );
  const { groceries } = useSelector((state: RootState) => state.grocery);
  const { userData } = useSelector((state: RootState) => state.user);

  const { status } = useSession();
  const isGuest = status === "unauthenticated";

  const [product, setProduct] = useState<IGrocery | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [returnPolicy, setReturnPolicy] = useState<{
    hasPolicy: boolean;
    isReturnable?: boolean;
    returnWindowDays?: number;
    policyType?: string;
    description?: string;
  } | null>(null);
  const [ratingData, setRatingData] = useState<{
    averageRating: number;
    totalReviews: number;
  }>({ averageRating: 0, totalReviews: 0 });
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const aiSectionRef = useRef<HTMLDivElement>(null);
  const [isWishlistOpen, setWishlistOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [pendingAiQuestion, setPendingAiQuestion] = useState("");
  const [speakingAiMessageId, setSpeakingAiMessageId] = useState<string | null>(null);
  const [isAiSpeechPaused, setIsAiSpeechPaused] = useState(false);
  const [aiSpeechRate, setAiSpeechRate] = useState(1);
  const [aiSpeechMode, setAiSpeechMode] = useState<"none" | "cloud" | "browser">("none");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const aiSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const aiSpeechAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiSpeechAudioUrlRef = useRef<string | null>(null);
  const aiSpeechPlaybackTokenRef = useRef(0);

  const defaultVariant = useMemo(
    () => product?.variants?.find((v) => v.isDefault) || product?.variants?.[0],
    [product],
  );

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find((v) => v._id === selectedVariantId) ||
      defaultVariant ||
      null
    );
  }, [product, selectedVariantId, defaultVariant]);

  const sellingPrice = selectedVariant?.price?.selling ?? 0;
  const mrpPrice = selectedVariant?.price?.mrp ?? sellingPrice;

  const cartItem = selectedVariant
    ? cartItems.find((item) => item.variant?._id === selectedVariant._id)
    : undefined;
  const quantity = cartItem?.quantity ?? 0;
  const stock = selectedVariant?.countInStock ?? 0;
  const isOutOfStock = stock === 0;
  const isMaxReached = stock !== undefined && quantity >= stock;

  useEffect(() => {
    if (params?.id) {
      fetchProduct(params.id);
    }
  }, [params?.id]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (aiSpeechAudioRef.current) {
        aiSpeechAudioRef.current.pause();
        aiSpeechAudioRef.current = null;
      }

      if (aiSpeechAudioUrlRef.current) {
        URL.revokeObjectURL(aiSpeechAudioUrlRef.current);
        aiSpeechAudioUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (aiSpeechMode === "cloud" && aiSpeechAudioRef.current) {
      aiSpeechAudioRef.current.playbackRate = aiSpeechRate;
    }
  }, [aiSpeechMode, aiSpeechRate]);

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
    if (product) {
      const variant =
        product.variants.find((v) => v.isDefault) || product.variants[0];
      setSelectedVariantId(variant?._id || null);
      setHeroImage(product.images?.[0]?.url || null);
      // Load return policy
      fetch(`/api/returns/policy?groceryId=${product._id}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setReturnPolicy(data);
          }
        })
        .catch(() => {});
      // Load ratings
      fetch(`/api/reviews/${product._id}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setRatingData({
                averageRating: data.data.averageRating || 0,
                totalReviews: data.data.totalReviews || 0,
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [product]);

  useEffect(() => {
    if (groceries.length === 0) {
      axios
        .get("/api/groceries")
        .then((res) => dispatch(setGroceries(res.data.groceries)))
        .catch((err) => console.error("Failed to load groceries", err));
    }
  }, [groceries.length, dispatch]);

  useEffect(() => {
    const checkSaved = async () => {
      if (!product?._id) return;
      try {
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        const data = await res.json();
        if (!data?.success) return;
        const saved = (data.collections || []).some(
          (c: any) =>
            Array.isArray(c?.items) &&
            c.items.some((i: any) => i.grocery === product._id),
        );
        setIsWishlisted(saved);
      } catch {
        setIsWishlisted(false);
      }
    };
    checkSaved();
  }, [product?._id]);

  useEffect(() => {
    if (status === "loading") return;

    const loadCart = async () => {
      if (status === "unauthenticated") {
        const guestCart = await getGuestCart();
        syncCartToStore({ items: guestCart?.items || [], isGuest: true });
      }

      if (status === "authenticated") {
        const cart = await fetchCartApi();
        syncCartToStore({
          items: cart?.items || [],
          cartId: cart?.cartId,
          isGuest: false,
        });
      }
    };

    loadCart();
  }, [status]);

  const syncCartToStore = (cart: any) => {
    let mappedCoupon: any = null;
    if (cart?.coupon) {
      let dv =
        cart.coupon.discountValue ??
        cart.coupon.discountAmount ??
        cart.coupon.discount ??
        0;
      if (
        (cart.coupon.discountType || "").toLowerCase() === "percentage" &&
        cart.coupon.discountValue === undefined &&
        appliedCoupon?.code === cart.coupon.code
      ) {
        dv = appliedCoupon?.discountValue ?? dv;
      }

      mappedCoupon = {
        code: cart.coupon.code,
        discountValue: dv,
        type:
          (cart.coupon.discountType || "").toLowerCase() === "percentage"
            ? "percentage"
            : "flat",
        maxDiscount: cart.coupon.maxDiscountAmount ?? cart.coupon.maxDiscount,
        minCartValue: cart.coupon.minCartValue,
      };
    }

    dispatch(
      setCart({
        items: cart?.items ?? [],
        cartId: cart?._id ?? cart?.cartId ?? null,
        isGuest: cart?.isGuest ?? false,
        appliedCoupon: mappedCoupon,
      }),
    );
  };

  const fetchProduct = async (id: string, retries = 3) => {
    try {
      setLoading(true);
      
      // Validate ID exists and is a string
      console.log(`[ProductDetails] Fetching product with ID: "${id}", Type: ${typeof id}, Length: ${String(id).length}`);
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new Error("Invalid product ID");
      }
      
      console.log(`[ProductDetails] Making API call to /api/groceries/${id}`);
      const response = await axios.get(`/api/groceries/${id}`, {
        timeout: 10000, // 10 second timeout
      });
      
      console.log(`[ProductDetails] Response:`, response.data);
      
      if (response.data?.success && response.data?.grocery) {
        const groceryData = response.data.grocery;
        console.log(`[ProductDetails] Successfully fetched product: ${groceryData.name}`);
        
        // Validate that we have essential data
        if (!groceryData._id || !groceryData.variants || groceryData.variants.length === 0) {
          throw new Error("Product data incomplete");
        }
        
        const normalizedVariants = (groceryData?.variants || []).map(
          (v: any) => ({
            ...v,
            variantName:
              typeof v?.variantName === "string"
                ? v.variantName.trim()
                : v?.variantName || "",
            label:
              v?.label ||
              (v?.unit?.value && v?.unit?.unit
                ? `${v.unit.value}${v.unit.unit}`
                : ""),
          }),
        );

        setProduct({ ...groceryData, variants: normalizedVariants });
      } else {
        throw new Error("Invalid product response");
      }
    } catch (error: any) {
      console.error("[ProductDetails] Failed to fetch product", error);
      
      // Retry logic for network errors
      if (retries > 0 && (error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
        console.log(`Retrying... (${retries} retries left)`);
        setTimeout(() => fetchProduct(id, retries - 1), 1000);
        return;
      }
      
      if (error.response?.status === 400) {
        toast.error("Invalid product ID. Please search again.");
      } else if (error.response?.status === 404) {
        toast.error("Product not found");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Unable to load product right now. Please try again.");
      }
      
      // Go back after a short delay to allow user to see the error
      setTimeout(() => router.back(), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant?._id) return;

    try {
      if (isGuest) {
        const updatedItems = [...cartItems];
        const existing = updatedItems.find(
          (i) => i.variant._id === selectedVariant._id,
        );

        if (existing) {
          if (existing.quantity < stock) existing.quantity += 1;
        } else {
          updatedItems.push({
            _id: generateTempCartItemId(),
            variant: selectedVariant,
            quantity: 1,
            priceAtAdd: {
              mrp: selectedVariant.price.mrp,
              selling: selectedVariant.price.selling,
            },
          });
        }

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const res = await addGuestCartApi(selectedVariant._id, 1);
        toast[res.success ? "success" : "error"](res.message);
      } else {
        const res = await addToCartApi(selectedVariant._id, 1);
        syncCartToStore(res);
        toast[res.success ? "success" : "error"](res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  const handleIncrease = async () => {
    if (!cartItem?._id || !selectedVariant?._id) return;

    try {
      if (isGuest) {
        const updatedItems = cartItems.map((i) =>
          i._id === cartItem._id && i.quantity < stock
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const newQty =
          updatedItems.find((i) => i._id === cartItem._id)?.quantity || 1;
        const res = await updateGuestCartApi(selectedVariant._id, newQty);
        toast[res.success ? "success" : "error"](res.message);
      } else {
        const res = await updateCartQuantityApi(cartItem._id, quantity + 1);
        syncCartToStore(res);
        toast[res.success ? "success" : "error"](res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  const handleDecrease = async () => {
    if (!cartItem?._id || !selectedVariant?._id) return;

    try {
      if (isGuest) {
        const updatedItems = cartItems
          .map((i) =>
            i._id === cartItem._id ? { ...i, quantity: i.quantity - 1 } : i,
          )
          .filter((i) => i.quantity > 0);

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const newQty =
          updatedItems.find((i) => i._id === cartItem._id)?.quantity || 0;
        const res = await updateGuestCartApi(selectedVariant._id, newQty);
        toast[res.success ? "success" : "error"](res.message);
      } else {
        const res = await updateCartQuantityApi(cartItem._id, quantity - 1);
        syncCartToStore(res);
        toast[res.success ? "success" : "error"](res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  const discountPercent = selectedVariant
    ? calculateDiscountPercentUI(mrpPrice, sellingPrice)
    : 0;

  const infoPills = [
    { icon: Clock3, title: "10-20 min", subtitle: "Lightning delivery" },
    { icon: Truck, title: "Free above ₹500", subtitle: "No hidden charges" },
    { icon: ShieldCheck, title: "Fresh & sealed", subtitle: "Checked twice" },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePosition({ x, y });
  };

  const openInlineProductAi = () => {
    if (!product) {
      return;
    }

    setAiQuestion(`${product.name} ke baare me quick details do aur best use-case batao`);
    aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const askProductAi = async (questionText?: string) => {
    if (!product || aiLoading) {
      return;
    }

    const finalQuestion = (questionText ?? aiQuestion).trim();
    if (!finalQuestion) {
      return;
    }

    const nextHistory = [...aiMessages, { role: "user" as const, content: finalQuestion }];
    setAiMessages([...nextHistory, { role: "assistant" as const, content: "__ai_loading__" }]);
    setPendingAiQuestion(finalQuestion);
    setAiQuestion("");
    setAiLoading(true);

    const replacePendingAssistant = (content: string) => {
      setAiMessages((prev) => {
        const updated = [...prev];
        for (let index = updated.length - 1; index >= 0; index -= 1) {
          if (updated[index]?.role === "assistant" && updated[index]?.content === "__ai_loading__") {
            updated[index] = { role: "assistant", content };
            return updated;
          }
        }

        return [...updated, { role: "assistant", content }];
      });
    };

    try {
      const response = await axios.post("/api/chatbot", {
        message: finalQuestion,
        history: nextHistory.slice(-8),
        role: userData?.currentRole || (isGuest ? "guest" : "user"),
        productContext: {
          productId: product._id,
          name: product.name,
          brand: product.brand,
          categoryName: product.category?.name,
          description: product.description,
          variantLabel: selectedVariant?.label,
          sellingPrice,
          mrpPrice,
          stock,
        },
      });

      if (response.data?.success) {
        replacePendingAssistant(response.data.reply || "Abhi exact answer unavailable hai.");
        if (Array.isArray(response.data.suggestions)) {
          setAiSuggestions(response.data.suggestions.slice(0, 3));
        }
      } else {
        replacePendingAssistant("Product AI response abhi unavailable hai. Thoda der baad try karein.");
      }
    } catch {
      replacePendingAssistant("Product AI temporarily unavailable hai. Please retry.");
    } finally {
      setAiLoading(false);
      setPendingAiQuestion("");
    }
  };

  const pickPreferredVoice = (content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }

    const lower = content.toLowerCase();
    const hasHindiHint =
      /[\u0900-\u097F]/.test(content) ||
      /(kya|kaise|hai|mera|mere|aap|nahi|batao|samjhao|kr|kar|product|variant|freshness|storage)/.test(lower);

    const scoreVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      const lang = (voice.lang || "").toLowerCase();
      let score = 0;

      if (hasHindiHint) {
        if (lang.startsWith("hi-in")) score += 80;
        else if (lang.startsWith("hi")) score += 70;
        else if (lang.startsWith("en-in")) score += 55;
      } else {
        if (lang.startsWith("en-in")) score += 80;
        else if (lang.startsWith("en-gb")) score += 60;
        else if (lang.startsWith("en-us")) score += 45;
        else if (lang.startsWith("hi-in")) score += 40;
      }

      if (name.includes("google")) score += 25;
      if (name.includes("microsoft")) score += 22;
      if (name.includes("natural") || name.includes("neural") || name.includes("wavenet")) score += 18;
      if (name.includes("india") || name.includes("hindi") || name.includes("indian")) score += 16;

      if (
        name.includes("female") ||
        name.includes("woman") ||
        name.includes("swara") ||
        name.includes("aditi") ||
        name.includes("priya") ||
        name.includes("raveena") ||
        name.includes("sangeeta")
      ) {
        score += 14;
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
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .replace(/\bETA\b/gi, "estimated time")
      .replace(/₹\s?(\d+)/g, "$1 rupees")
      .replace(/\bkg\b/gi, "kilogram")
      .replace(/\bgm\b/gi, "gram")
      .replace(/\bml\b/gi, "milliliter")
      .replace(/\s*\/\s*/g, " or ")
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

  const stopCurrentAiSpeechPlayback = () => {
    aiSpeechPlaybackTokenRef.current += 1;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (aiSpeechAudioRef.current) {
      aiSpeechAudioRef.current.pause();
      aiSpeechAudioRef.current = null;
    }

    if (aiSpeechAudioUrlRef.current) {
      URL.revokeObjectURL(aiSpeechAudioUrlRef.current);
      aiSpeechAudioUrlRef.current = null;
    }

    setAiSpeechMode("none");
  };

  const playBrowserAiSpeech = (messageId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const normalized = normalizeTextForSpeech(text);
    const chunks = splitSpeechChunks(normalized);
    if (chunks.length === 0) {
      return;
    }

    const playbackToken = ++aiSpeechPlaybackTokenRef.current;
    const preferredVoice = pickPreferredVoice(normalized);

    setSpeakingAiMessageId(messageId);
    setIsAiSpeechPaused(false);
    setAiSpeechMode("browser");

    const speakChunk = (chunkIndex: number) => {
      if (playbackToken !== aiSpeechPlaybackTokenRef.current) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      }

      utterance.rate = aiSpeechRate * 0.96;
      utterance.pitch = 1.08;
      utterance.volume = 1;

      utterance.onend = () => {
        if (playbackToken !== aiSpeechPlaybackTokenRef.current) {
          return;
        }

        if (chunkIndex < chunks.length - 1) {
          speakChunk(chunkIndex + 1);
          return;
        }

        setSpeakingAiMessageId(null);
        setIsAiSpeechPaused(false);
        setAiSpeechMode("none");
        aiSpeechUtteranceRef.current = null;
      };

      utterance.onerror = () => {
        if (playbackToken !== aiSpeechPlaybackTokenRef.current) {
          return;
        }

        setSpeakingAiMessageId(null);
        setIsAiSpeechPaused(false);
        setAiSpeechMode("none");
        aiSpeechUtteranceRef.current = null;
        toast.error("Unable to play this response as audio");
      };

      aiSpeechUtteranceRef.current = utterance;
      synth.speak(utterance);
    };

    speakChunk(0);
  };

  const playCloudAiSpeech = async (messageId: string, text: string) => {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Cloud TTS unavailable");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    audio.playbackRate = aiSpeechRate;

    aiSpeechAudioRef.current = audio;
    aiSpeechAudioUrlRef.current = objectUrl;
    setAiSpeechMode("cloud");
    setSpeakingAiMessageId(messageId);
    setIsAiSpeechPaused(false);

    audio.onended = () => {
      setSpeakingAiMessageId(null);
      setIsAiSpeechPaused(false);
      setAiSpeechMode("none");
      if (aiSpeechAudioUrlRef.current) {
        URL.revokeObjectURL(aiSpeechAudioUrlRef.current);
        aiSpeechAudioUrlRef.current = null;
      }
      aiSpeechAudioRef.current = null;
    };

    audio.onerror = () => {
      setSpeakingAiMessageId(null);
      setIsAiSpeechPaused(false);
      setAiSpeechMode("none");
      if (aiSpeechAudioUrlRef.current) {
        URL.revokeObjectURL(aiSpeechAudioUrlRef.current);
        aiSpeechAudioUrlRef.current = null;
      }
      aiSpeechAudioRef.current = null;
      toast.error("Unable to play this response as audio");
    };

    await audio.play();
  };

  const toggleAiSpeechForMessage = async (messageId: string, content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio playback is not supported in this browser");
      return;
    }

    const synth = window.speechSynthesis;
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const isSameMessage = speakingAiMessageId === messageId;

    if (isSameMessage && aiSpeechMode === "cloud" && aiSpeechAudioRef.current) {
      if (aiSpeechAudioRef.current.paused) {
        try {
          await aiSpeechAudioRef.current.play();
          setIsAiSpeechPaused(false);
        } catch {
          toast.error("Unable to resume audio");
        }
      } else {
        aiSpeechAudioRef.current.pause();
        setIsAiSpeechPaused(true);
      }
      return;
    }

    if (isSameMessage && synth.speaking && !synth.paused) {
      synth.pause();
      setIsAiSpeechPaused(true);
      return;
    }

    if (isSameMessage && synth.paused) {
      synth.resume();
      setIsAiSpeechPaused(false);
      return;
    }

    stopCurrentAiSpeechPlayback();

    if (cloudTtsEnabled) {
      try {
        await playCloudAiSpeech(messageId, trimmedContent);
        return;
      } catch {
      }
    }

    playBrowserAiSpeech(messageId, trimmedContent);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        {userData && <Navbar user={userData} />}
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-16">
          <div className="animate-pulse grid lg:grid-cols-2 gap-10">
            <div className="h-[420px] rounded-3xl bg-gradient-to-br from-white to-emerald-50" />
            <div className="space-y-6">
              <div className="h-6 w-3/4 bg-emerald-100 rounded-full" />
              <div className="h-12 w-full bg-emerald-50 rounded-2xl" />
              <div className="h-12 w-2/3 bg-emerald-100 rounded-2xl" />
              <div className="h-24 w-full bg-white rounded-3xl shadow" />
              <div className="h-16 w-full bg-white rounded-3xl shadow" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="bg-white shadow-xl rounded-3xl p-10 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Product not available
          </p>
          <p className="text-sm text-gray-600 mb-6">
            We couldn't load this product. It may have been removed or is temporarily unavailable.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => params?.id && fetchProduct(params.id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50">
      {userData && <Navbar user={userData} />}

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-16">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
            >
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link
              href={`/user/products?category=${product.category._id}`}
              className="text-gray-700 hover:text-emerald-700"
            >
              {product.category.name}
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{product.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
              <span className="inline-flex items-center gap-1 bg-white shadow px-3 py-2 rounded-full">
                <Clock3 className="w-4 h-4 text-emerald-600" /> 10-20 mins
              </span>
              <span className="inline-flex items-center gap-1 bg-white shadow px-3 py-2 rounded-full">
                <Truck className="w-4 h-4 text-emerald-600" /> On-time delivery
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 bg-white shadow px-3 py-2 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure
                packaging
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWishlistOpen(true)}
                className={`p-3 rounded-full border bg-white shadow hover:shadow-md transition ${
                  isWishlisted
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-transparent text-gray-600"
                }`}
                aria-label={
                  isWishlisted ? "Saved to wishlist" : "Open wishlist"
                }
              >
                <Heart
                  className={`w-5 h-5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`}
                />
              </button>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 bg-white shadow rounded-full text-gray-700 hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex gap-4">
              {/* Thumbnails on the left */}
              {product.images && product.images.length > 1 && (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px]">
                  {product.images.map((img) => (
                    <button
                      key={img.publicId}
                      onClick={() => setHeroImage(img.url)}
                      className={`relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                        heroImage === img.url
                          ? "border-emerald-600 ring-2 ring-emerald-200 shadow-lg"
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image with zoom */}
              <div className="flex-1 relative bg-white/80 backdrop-blur rounded-3xl shadow-xl overflow-hidden">
                <div
                  className="aspect-square relative cursor-crosshair"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                >
                  {heroImage ? (
                    <>
                      <Image
                        src={heroImage}
                        alt={product.name}
                        fill
                        placeholder="blur"
                        blurDataURL={shimmer}
                        className="object-contain p-6 transition-opacity duration-300"
                        style={{ opacity: isZoomed ? 0 : 1 }}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      {/* Zoomed view */}
                      {isZoomed && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundImage: `url(${heroImage})`,
                            backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
                            backgroundSize: "250%",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-emerald-50" />
                  )}

                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.badges?.isBestSeller && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                        <Star className="w-4 h-4" /> Bestseller
                      </span>
                    )}
                    {product.badges?.isNew && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                        <Sparkles className="w-4 h-4" /> New arrival
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {infoPills.map((pill) => (
                <div
                  key={pill.title}
                  className="bg-white/90 backdrop-blur rounded-2xl shadow px-4 py-3 flex items-center gap-3"
                >
                  <pill.icon className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {pill.title}
                    </p>
                    <p className="text-xs text-gray-500">{pill.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 lg:p-8 space-y-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {product.category.name}
                </p>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h1>
                {/* Rating Display */}
                {ratingData.totalReviews > 0 && (
                  <button
                    onClick={() =>
                      reviewSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="flex items-center gap-2 mt-2 text-sm hover:opacity-80 transition-opacity cursor-pointer group"
                  >
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(ratingData.averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {ratingData.averageRating.toFixed(1)}
                    </span>
                    <span className="text-gray-500">
                      ({ratingData.totalReviews}{" "}
                      {ratingData.totalReviews === 1 ? "review" : "reviews"})
                    </span>
                    <span className="text-emerald-600 text-xs group-hover:underline">
                      See reviews ↓
                    </span>
                  </button>
                )}
                {returnPolicy?.hasPolicy && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {returnPolicy.returnWindowDays &&
                      returnPolicy.isReturnable
                        ? `${returnPolicy.returnWindowDays} days returns`
                        : returnPolicy.policyType === "both"
                          ? "Return or Replacement"
                          : returnPolicy.policyType === "return-only"
                            ? `${returnPolicy.returnWindowDays || "X"} days returns`
                            : returnPolicy.policyType === "replacement-only"
                              ? "Replacement only"
                              : "Not returnable"}
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  by {product.brand || "Fresh Mart"}
                </p>
                <button
                  type="button"
                  onClick={openInlineProductAi}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 text-sm font-semibold"
                >
                  <Sparkles className="w-4 h-4" /> Ask AI about this product
                </button>
              </div>
            </div>

            {/* Professional Price Display */}
            <div>
              <PriceDisplay
                mrp={mrpPrice}
                selling={sellingPrice}
                size="lg"
                showSavings={true}
                showDiscount={true}
              />
              <p className="text-xs text-gray-500 mt-2">
                Inclusive of all taxes
              </p>
              {hasVariablePricing(product.variants) && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  💰 Different sizes, different prices - Select your preferred
                  size below
                </p>
              )}
              {selectedVariant && (
                <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-gray-700">
                  <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-semibold">
                    <Zap className="w-4 h-4" />
                    {selectedVariant.label ||
                      `${selectedVariant.unit.value}${selectedVariant.unit.unit}`}
                  </span>
                  {selectedVariant.variantName && (
                    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold">
                      <Check className="w-4 h-4" />{" "}
                      {selectedVariant.variantName}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Professional Variant Selector with Dynamic Pricing */}
            <VariantSelector
              variants={product.variants}
              selectedVariantId={selectedVariantId}
              onVariantSelect={setSelectedVariantId}
              showPrices={true}
            />

            {/* Price Comparison Info for Variable Pricing */}
            <PriceComparisonInfo variants={product.variants} />

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl font-semibold">
                <ShieldCheck className="w-4 h-4" /> Fresh stock
              </span>
              {isOutOfStock ? (
                <span className="text-red-600 font-semibold">Out of stock</span>
              ) : stock <= 5 ? (
                <span className="text-orange-600 font-semibold">
                  Only {stock} left
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  {stock} in stock
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {quantity === 0 ? (
                <button
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-2xl py-3 font-semibold text-lg shadow-lg transition-all"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to cart
                </button>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
                  <div className="text-sm text-emerald-800 font-semibold">
                    In your cart
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDecrease}
                      className="w-10 h-10 rounded-full bg-white border border-emerald-200 flex items-center justify-center hover:bg-emerald-100"
                    >
                      <Minus className="w-4 h-4 text-emerald-700" />
                    </button>
                    <span className="w-8 text-center font-semibold text-emerald-800">
                      {quantity}
                    </span>
                    <button
                      disabled={isMaxReached}
                      onClick={handleIncrease}
                      className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Freshness guaranteed
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Easy returns if damaged
                </div>
              </div>
            </div>

            {product.description && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Why you'll love it
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            <div ref={aiSectionRef} className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-700" />
                <p className="text-sm font-semibold text-emerald-800">Ask AI about this product</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  `${product.name} kis use-case ke liye best hai?`,
                  `Is product ka freshness aur storage guide batao`,
                  `Iske alternatives compare karo`,
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => askProductAi(prompt)}
                    className="text-xs rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 px-3 py-1.5"
                    disabled={aiLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      askProductAi();
                    }
                  }}
                  placeholder="Is product ke baare me kuch bhi pucho..."
                  className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => askProductAi()}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {aiLoading ? "Asking..." : "Ask"}
                </button>
              </div>

              {aiMessages.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {aiMessages.slice(-6).map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-white text-gray-800 border border-gray-200"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}
                    >
                      {msg.role === "assistant" && msg.content === "__ai_loading__" ? (
                        <div className="inline-flex items-center gap-2 text-emerald-800">
                          <span className="font-medium">{getProductAiTypingLabel(pendingAiQuestion)}</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:120ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:240ms]" />
                          </span>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                      {msg.role === "assistant" && msg.content.trim() && msg.content !== "__ai_loading__" ? (
                        <div className="mt-2 flex justify-end items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleAiSpeechForMessage(`pdp-assistant-${index}`, msg.content)}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100"
                            title={
                              speakingAiMessageId === `pdp-assistant-${index}` && !isAiSpeechPaused
                                ? "Pause audio"
                                : "Play audio"
                            }
                          >
                            {speakingAiMessageId === `pdp-assistant-${index}` && !isAiSpeechPaused ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            {speakingAiMessageId === `pdp-assistant-${index}` && !isAiSpeechPaused ? "Pause" : "Play"}
                          </button>

                          {[0.9, 1, 1.2].map((rate) => (
                            <button
                              key={`pdp-speech-rate-${rate}`}
                              type="button"
                              onClick={() => setAiSpeechRate(rate)}
                              className={`rounded-full border px-2 py-1 text-[11px] ${
                                aiSpeechRate === rate
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={`Speech speed ${rate}x`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700">Tip: product ingredients, quantity suitability, storage, alternatives, aur value-for-money puch sakte ho.</p>
              )}

              {aiSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => askProductAi(suggestion)}
                      className="text-xs rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 px-3 py-1.5"
                      disabled={aiLoading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>

        {/* Customer Reviews Section */}
        <div ref={reviewSectionRef} className="mt-12 scroll-mt-24">
          <ReviewSection groceryId={product._id} />
        </div>

        {groceries.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  More from {product.category.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Explore similar products you might like
                </p>
              </div>
              <Link
                href={`/user/products?category=${product.category._id}`}
                className="inline-flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {groceries
                .filter(
                  (g) =>
                    g._id !== product._id &&
                    g.category._id === product.category._id,
                )
                .slice(0, 8)
                .map((item) => (
                  <GroceryItemCard key={item._id} grocery={item} />
                ))}
            </div>
            {groceries.filter(
              (g) =>
                g._id !== product._id &&
                g.category._id === product.category._id,
            ).length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-3xl">
                <p className="text-gray-500">
                  No similar products available at the moment
                </p>
                <Link
                  href="/user/products"
                  className="inline-flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-800 mt-4"
                >
                  Browse all products
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto sm:left-auto sm:right-6 sm:translate-x-0 lg:hidden">
        <div className="bg-white shadow-2xl rounded-2xl flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{sellingPrice.toFixed(0)}
              {quantity > 0 && (
                <span className="text-sm text-gray-500"> × {quantity}</span>
              )}
            </p>
          </div>
          {quantity === 0 ? (
            <button
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-semibold disabled:bg-gray-300"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDecrease}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                disabled={isMaxReached}
                onClick={handleIncrease}
                className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <AdvancedWishlistSheet
        isOpen={isWishlistOpen}
        onClose={() => setWishlistOpen(false)}
        productId={product._id}
        productTitle={product.name}
        productImage={heroImage || product.images?.[0]?.url}
        onSavedChange={(saved) => setIsWishlisted(saved)}
      />
    </div>
  );
};

export default ProductDetailsPage;
