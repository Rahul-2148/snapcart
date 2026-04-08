"use client";

import axios from "axios";
import { ShoppingBasket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string;
  image: {
    url: string;
    publicId: string;
  };
  order: number;
  icon?: string;
  iconColor?: string;
  isActive: boolean;
}

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  // Helper to get lucide icon component by name
  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || null;
  };

  // Fetch banners from database
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/banners");
      if (response.data.success && response.data.banners.length > 0) {
        setBanners(response.data.banners);
      } else {
        // Fallback to default banners if none exist in DB
        setBanners(DEFAULT_SLIDES);
      }
    } catch (error) {
      // Fallback to default banners on error
      setBanners(DEFAULT_SLIDES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Listen for real-time banner updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleBannerCreated = () => {
      fetchBanners();
    };

    const handleBannerUpdated = () => {
      fetchBanners();
    };

    const handleBannerDeleted = () => {
      fetchBanners();
    };

    socket.on("banner:created", handleBannerCreated);
    socket.on("banner:updated", handleBannerUpdated);
    socket.on("banner:deleted", handleBannerDeleted);

    return () => {
      socket.off("banner:created", handleBannerCreated);
      socket.off("banner:updated", handleBannerUpdated);
      socket.off("banner:deleted", handleBannerDeleted);
    };
  }, [socket]);

  // Auto-rotate slides
  useEffect(() => {
    if (banners.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) {
    return (
      <div className="relative w-[98%] mx-auto mt-2 h-[48vh] sm:h-[60vh] lg:h-[80vh] rounded-3xl overflow-hidden shadow-2xl bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="relative w-[98%] mx-auto mt-2 h-[48vh] sm:h-[60vh] lg:h-[80vh] rounded-3xl overflow-hidden shadow-2xl bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">No banners available</p>
      </div>
    );
  }

  const currentBanner = banners[currentSlide];

  return (
    <div className="relative w-[98%] mx-auto mt-2 h-[48vh] sm:h-[60vh] lg:h-[80vh] rounded-3xl overflow-hidden shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          <Image
            src={currentBanner.image.url}
            alt={currentBanner.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] " />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-6">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center gap-6 max-w-3xl"
        >
          <h1 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg inline-flex items-center gap-3">
            <span>{currentBanner.title}</span>
            {currentBanner.icon &&
              (() => {
                const IconComponent = getIconComponent(currentBanner.icon);
                if (IconComponent) {
                  return (
                    <IconComponent
                      className="w-8 h-8 sm:w-12 sm:h-12"
                      style={{ color: currentBanner.iconColor || "#ffffff" }}
                    />
                  );
                }
                return (
                  <span
                    className="text-3xl sm:text-5xl"
                    style={{ color: currentBanner.iconColor || "#ffffff" }}
                  >
                    {currentBanner.icon}
                  </span>
                );
              })()}
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 max-w-2xl">
            {currentBanner.subtitle}
          </p>
          <Link href={currentBanner.buttonLink || "/user/products"}>
            <motion.button
              className="mt-4 md:mb-2 mb-0 bg-white text-green-700 hover:bg-green-100 px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-300 flex items-center gap-2"
              whileHover={{ scale: 1.09 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              <ShoppingBasket className="w-5 h-5" />
              {currentBanner.buttonText}
            </motion.button>
          </Link>
        </motion.div>
      </div>

      <div className="absolute md:bottom-4.5 bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? "bg-white w-6" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSection;

// Default fallback slides if no banners in database
const DEFAULT_SLIDES = [
  {
    _id: "default-1",
    title: "Fresh Organic Groceries",
    subtitle:
      "Farm-fresh fruits, vegetables, and daily essentials delivered to you.",
    buttonText: "Shop Now",
    image: {
      url: "https://plus.unsplash.com/premium_photo-1663012860167-220d9d9c8aca?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      publicId: "",
    },
    order: 0,
    icon: "Leaf",
    iconColor: "#22c55e",
    isActive: true,
  },
  {
    _id: "default-2",
    title: "Fast & Reliable Delivery",
    subtitle: "We ensure your groceries reach your doorstep in no time.",
    buttonText: "Order Now",
    image: {
      url: "https://images.unsplash.com/photo-1607130232670-52123ba5be5c?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      publicId: "",
    },
    order: 1,
    icon: "Truck",
    iconColor: "#3b82f6",
    isActive: true,
  },
  {
    _id: "default-3",
    title: "Shop Anytime, Anywhere",
    subtitle: "Easy and seamless online grocery shopping experience.",
    buttonText: "Get Started",
    image: {
      url: "https://images.unsplash.com/photo-1661713093950-89ff279c6610?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      publicId: "",
    },
    order: 2,
    icon: "ShoppingBag",
    iconColor: "#f59e0b",
    isActive: true,
  },
];
