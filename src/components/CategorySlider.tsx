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
import { useEffect, useRef, useState } from "react";
import { FaBreadSlice } from "react-icons/fa";

const categories = [
  { id: 1, name: "Fruits & Vegetables", icon: Apple, color: "bg-green-100" },
  { id: 2, name: "Dairy & Eggs", icon: Milk, color: "bg-amber-100" },
  { id: 3, name: "Rice, Atta & Grains", icon: Wheat, color: "bg-yellow-100" },
  { id: 4, name: "Oil & Ghee", icon: Droplets, color: "bg-orange-100" },
  { id: 5, name: "Snacks & Biscuits", icon: Cookie, color: "bg-rose-100" },
  { id: 6, name: "Beverages & Drinks", icon: Coffee, color: "bg-sky-100" },
  {
    id: 7,
    name: "Breakfast & Cereals",
    icon: Croissant,
    color: "bg-orange-50",
  },
  { id: 8, name: "Spices & Condiments", icon: Flame, color: "bg-red-100" },
  { id: 9, name: "Dry Fruits & Nuts", icon: Nut, color: "bg-amber-50" },
  { id: 10, name: "Instant & Packaged Foods", icon: Box, color: "bg-teal-100" },
  {
    id: 11,
    name: "Bakery & Breads",
    icon: FaBreadSlice,
    color: "bg-yellow-50",
  },
  { id: 12, name: "Sweets & Chocolates", icon: Candy, color: "bg-pink-100" },
  { id: 13, name: "Frozen Foods", icon: Snowflake, color: "bg-cyan-100" },
  { id: 14, name: "Meat & Seafood", icon: Fish, color: "bg-blue-100" },
  { id: 15, name: "Baby & Pet Care", icon: Baby, color: "bg-rose-50" },
  { id: 16, name: "Personal Care", icon: Heart, color: "bg-pink-50" },
  { id: 17, name: "Cleaning & Laundry", icon: SprayCan, color: "bg-sky-50" },
  { id: 18, name: "Household Essentials", icon: Home, color: "bg-lime-100" },
  { id: 19, name: "Pooja Needs", icon: Flower2, color: "bg-orange-100" },
  { id: 20, name: "Pharmacy & Health", icon: Pill, color: "bg-red-50" },
  {
    id: 21,
    name: "Stationery & Office",
    icon: PenTool,
    color: "bg-indigo-100",
  },
  { id: 22, name: "Others", icon: Grid2X2, color: "bg-gray-100" },
];

const CategorySlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const startXRef = useRef(0);
  const isTouchingRef = useRef(false);
  const isPausedRef = useRef(false);

  const rubberX = useMotionValue(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
      <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-6 text-center">
        Shop by Category
      </h2>

      {/* LEFT */}
      <button
        disabled={!canScrollLeft}
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
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className={`snap-start min-w-[150px] md:min-w-[180px]
              rounded-2xl shadow-md hover:shadow-xl transition-all
              flex flex-col items-center justify-center cursor-pointer ${cat.color}`}
            >
              <div className="p-5 flex flex-col items-center">
                <Icon className="w-10 h-10 text-green-700 mb-3" />
                <p className="text-sm md:text-base font-semibold text-gray-700 text-center">
                  {cat.name}
                </p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* RIGHT */}
      <button
        disabled={!canScrollRight}
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
