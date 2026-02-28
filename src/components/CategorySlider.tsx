"use client";

import {
  Apple,
  Baby,
  Box,
  Candy,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Croissant,
  Droplets,
  Fish,
  Flame,
  Flower2,
  Grid2X2,
  Heart,
  Home,
  Milk,
  Nut,
  PenTool,
  Pill,
  Snowflake,
  SprayCan,
  Wheat,
} from "lucide-react";
import { motion, useMotionValue, animate } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaBreadSlice } from "react-icons/fa";
import axios from "axios";

// Icon mapping  - using static category icons
const getIconForCategory = (categoryName: string) => {
  switch (categoryName) {
    case "Fruits & Vegetables":
      return Apple;
    case "Dairy & Eggs":
      return Milk;
    case "Rice, Atta & Grains":
      return Wheat;
    case "Oil & Ghee":
      return Droplets;
    case "Snacks & Biscuits":
      return Cookie;
    case "Beverages & Drinks":
      return Coffee;
    case "Breakfast & Cereals":
      return Croissant;
    case "Spices & Condiments":
      return Flame;
    case "Dry Fruits & Nuts":
      return Nut;
    case "Instant & Packaged Foods":
      return Box;
    case "Bakery & Breads":
      return FaBreadSlice;
    case "Sweets & Chocolates":
      return Candy;
    case "Frozen Foods":
      return Snowflake;
    case "Meat & Seafood":
      return Fish;
    case "Baby & Pet Care":
      return Baby;
    case "Personal Care":
      return Heart;
    case "Cleaning & Laundry":
      return SprayCan;
    case "Household Essentials":
      return Home;
    case "Pooja Needs":
      return Flower2;
    case "Pharmacy & Health":
      return Pill;
    case "Stationery & Office":
      return PenTool;
    default:
      return Grid2X2;
  }
};

const colorMap: Record<string, string> = {
  "Fruits & Vegetables": "bg-green-100",
  "Dairy & Eggs": "bg-amber-100",
  "Rice, Atta & Grains": "bg-yellow-100",
  "Oil & Ghee": "bg-orange-100",
  "Snacks & Biscuits": "bg-rose-100",
  "Beverages & Drinks": "bg-sky-100",
  "Breakfast & Cereals": "bg-orange-50",
  "Spices & Condiments": "bg-red-100",
  "Dry Fruits & Nuts": "bg-amber-50",
  "Instant & Packaged Foods": "bg-teal-100",
  "Bakery & Breads": "bg-yellow-50",
  "Sweets & Chocolates": "bg-pink-100",
  "Frozen Foods": "bg-cyan-100",
  "Meat & Seafood": "bg-blue-100",
  "Baby & Pet Care": "bg-rose-50",
  "Personal Care": "bg-pink-50",
  "Cleaning & Laundry": "bg-sky-50",
  "Household Essentials": "bg-lime-100",
  "Pooja Needs": "bg-orange-100",
  "Pharmacy & Health": "bg-red-50",
  "Stationery & Office": "bg-indigo-100",
  "Others": "bg-gray-100",
};

interface FetchedCategory {
  _id: string;
  name: string;
}

const CategorySlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const startXRef = useRef(0);
  const isTouchingRef = useRef(false);
  const isPausedRef = useRef(false);

  const rubberX = useMotionValue(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [categories, setCategories] = useState<FetchedCategory[]>([]);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const amount =
      window.innerWidth < 768 ? el.clientWidth * 0.8 : el.clientWidth;

    el.scrollTo({
      left: dir === "left" ? el.scrollLeft - amount : el.scrollLeft + amount,
      behavior: "smooth",
    });
  };

  const startAutoScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    autoScrollRef.current = setInterval(() => {
      if (isPausedRef.current) return;

      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;

      el.scrollTo({
        left: atEnd ? 0 : el.scrollLeft + el.clientWidth,
        behavior: "smooth",
      });
    }, 3000);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
  };

  // Rubber band logic
  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isTouchingRef.current = true;
    isPausedRef.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isTouchingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    const delta = e.touches[0].clientX - startXRef.current;
    const atLeft = el.scrollLeft <= 0;
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;

    if ((atLeft && delta > 0) || (atRight && delta < 0)) {
      const resistance = delta * 0.25;
      rubberX.set(resistance);
    }
  };

  const onTouchEnd = () => {
    isTouchingRef.current = false;
    isPausedRef.current = false;

    animate(rubberX, 0, {
      type: "spring",
      stiffness: 300,
      damping: 25,
    });
  };

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/api/categories");
        if (response.data.success) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    
    fetchCategories();
  }, []);

  useEffect(() => {
    updateScrollButtons();
    startAutoScroll();
    return () => stopAutoScroll();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-[90%] md:w-[80%] mx-auto mt-10 relative"
    >
      <div className="mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
          <h2 className="text-2xl md:text-3xl font-bold text-green-700 text-center md:text-center flex-1">
            Shop by Category
          </h2>
          <Link
            href="/user/products"
            className="text-green-600 hover:text-green-800 font-semibold text-sm md:text-base text-center md:text-right"
          >
            View all categories →
          </Link>
        </div>
      </div>

      {/* LEFT */}
      <button
        disabled={!canScrollLeft}
        suppressHydrationWarning
        onClick={() => scroll("left")}
        className={`absolute left-0 top-1/2 -translate-y-[10%] z-10
        bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center
        ${!canScrollLeft ? "opacity-40" : "hover:bg-green-100"}`}
      >
        <ChevronLeft className="w-6 h-6 text-green-700" />
      </button>

      <motion.div
        ref={scrollRef}
        style={{ x: rubberX, WebkitOverflowScrolling: "touch" }}
        onScroll={updateScrollButtons}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => (isPausedRef.current = true)}
        onMouseLeave={() => (isPausedRef.current = false)}
        className="flex gap-6 overflow-x-auto px-10 pb-4 scrollbar-hide
        snap-x snap-mandatory overscroll-x-contain"
      >
        {categories.map((cat) => {
          const Icon = getIconForCategory(cat.name);
          const color = colorMap[cat.name] || "bg-gray-100";
          
          return (
            <Link
              key={cat._id}
              href={`/user/products?category=${cat._id}`}
              className={`snap-start min-w-[150px] md:min-w-[180px]
              rounded-2xl shadow-md hover:shadow-xl transition-all
              flex flex-col items-center justify-center cursor-pointer ${color}
              hover:scale-105 hover:brightness-95`}
            >
              <div className="p-5 flex flex-col items-center">
                <Icon className="w-10 h-10 text-green-700 mb-3" />
                <p className="text-sm md:text-base font-semibold text-gray-700 text-center">
                  {cat.name}
                </p>
              </div>
            </Link>
          );
        })}
      </motion.div>

      {/* RIGHT */}
      <button
        disabled={!canScrollRight}
        suppressHydrationWarning
        onClick={() => scroll("right")}
        className={`absolute right-0 top-1/2 -translate-y-[10%] z-10
        bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center
        ${!canScrollRight ? "opacity-40" : "hover:bg-green-100"}`}
      >
        <ChevronRight className="w-6 h-6 text-green-700" />
      </button>
    </motion.div>
  );
};

export default CategorySlider;
