// src/components/UserDashboard.tsx

"use client";



import { useEffect, useLayoutEffect, useState } from "react";

import axios from "axios";

import { useDispatch, useSelector } from "react-redux";

import { ArrowUp, Sparkles } from "lucide-react";

import Link from "next/link";

import { motion, useScroll, useSpring } from "framer-motion";



import CategorySlider from "./CategorySlider";

import HeroSection from "./HeroSection";

import GroceryItemCard from "./GroceryItemCard";

import { useStoreInventory } from "@/hooks/useStoreInventory";

import StoreInfoBar from "@/components/location/StoreInfoBar";
import ComingSoonSection from "@/components/location/ComingSoonSection";



import { setGroceries } from "@/redux/features/grocerySlice";

import { AppDispatch, RootState } from "@/redux/store";



const UserDashboard = () => {

  const dispatch = useDispatch<AppDispatch>();

  const [categories, setCategories] = useState<any[]>([]);

  const [showBackToTop, setShowBackToTop] = useState(false);

  // Store inventory hook
  const { hasStore } = useStoreInventory();



  // On first mount, ensure page starts at the top (avoid restored scroll positions)

  useLayoutEffect(() => {

    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {

      window.history.scrollRestoration = "manual";

    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {

      if (typeof window !== "undefined" && "scrollRestoration" in window.history) {

        window.history.scrollRestoration = "auto";

      }

    };

  }, []);



  // Scroll progress tracking

  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {

    stiffness: 100,

    damping: 30,

    restDelta: 0.001,

  });



  // groceries redux se aayega
  const { groceries } = useSelector((state: RootState) => state.grocery);
  const { serviceableStatus } = useSelector((state: RootState) => state.location);



  useEffect(() => {

    const getGroceries = async () => {

      try {

        const response = await axios.get("/api/groceries");

        dispatch(setGroceries(response.data.groceries));

      } catch (error) {

        console.error("Error fetching groceries:", error);

      }

    };



    const getCategories = async () => {

      try {

        const response = await axios.get("/api/categories");

        setCategories(response.data.categories || []);

      } catch (error) {

        console.error("Error fetching categories:", error);

      }

    };



    if (!hasStore) {
      getGroceries();
    }

    getCategories();

  }, [dispatch, hasStore]);



  // Handle scroll for back to top button

  useEffect(() => {

    const handleScroll = () => {

      if (window.scrollY > 300) {

        setShowBackToTop(true);

      } else {

        setShowBackToTop(false);

      }

    };



    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);

  }, []);



  // Scroll to top function

  const scrollToTop = () => {

    const element = document.documentElement;

    const start = element.scrollTop;

    const duration = 800; // 800ms smooth scroll

    const startTime = performance.now();



    const easeInOutQuad = (t: number) => {

      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    };



    const scroll = (currentTime: number) => {

      const elapsed = currentTime - startTime;

      const progress = Math.min(elapsed / duration, 1);

      const ease = easeInOutQuad(progress);

      element.scrollTop = start * (1 - ease);



      if (progress < 1) {

        requestAnimationFrame(scroll);

      }

    };



    requestAnimationFrame(scroll);

  };



  const openAIChatbot = () => {

    if (typeof window === "undefined") {

      return;

    }

    window.dispatchEvent(new Event("snapcart-ai-open"));

  };



  // Filter groceries by different criteria

  const bestSellers = groceries.filter((g: any) => g.badges?.isBestSeller);

  const newArrivals = groceries.filter((g: any) => g.badges?.isNew);

  const featured = groceries.filter((g: any) => g.badges?.isFeatured);

  const popularItems = groceries.slice(0, 12); // Show more items in horizontal scroll



  // Get groceries by category (show more for horizontal scroll)

  const getGroceriesByCategory = (categoryId: string) => {

    return groceries

      .filter((g: any) => g.category?._id === categoryId)

      .slice(0, 12);

  };



  // Render a product section with horizontal scroll

  const renderProductSection = (

    title: string,

    items: any[],

    bgColor: string = "bg-white",

    categoryId?: string,

  ) => {

    if (!items || items.length === 0) return null;



    // Build the "See All" link based on filter type

    let seeAllLink = "/user/products";

    if (title === "Featured Products") {

      seeAllLink = "/user/products?badge=featured";

    } else if (title === "Best Sellers") {

      seeAllLink = "/user/products?badge=bestseller";

    } else if (title === "New Arrivals") {

      seeAllLink = "/user/products?badge=new";

    } else if (categoryId) {

      seeAllLink = `/user/products?category=${categoryId}`;

    }



    return (

      <div className={`${bgColor} py-6 md:py-10`}>

        <div className="w-full px-4 md:px-8 lg:px-12">

          <div className="flex justify-between items-center mb-4 md:mb-6">

            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-green-700">

              {title}

            </h2>

            <Link

              href={seeAllLink}

              className="text-green-600 hover:text-green-800 font-semibold text-sm md:text-base transition-colors whitespace-nowrap"

            >

              See All →

            </Link>

          </div>



          {/* Horizontal Scrollable Container */}

          <div className="relative">

            <div

              className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"

              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}

            >

              {items.map((grocery) => (

                <div

                  key={grocery._id}

                  className="flex-shrink-0 w-[46%] sm:w-[32%] md:w-[28%] lg:w-[23%] xl:w-[19%]"

                >

                  <GroceryItemCard grocery={grocery} />

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    );

  };



  if (serviceableStatus === "not_serviceable") {
    return (
      <>
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-600 to-green-700 origin-left z-50 shadow-lg"
          style={{ scaleX }}
        />
        <StoreInfoBar />
        <HeroSection />
        <ComingSoonSection />
      </>
    );
  }

  return (
    <>

      {/* Scroll Progress Bar */}

      <motion.div

        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-600 to-green-700 origin-left z-50 shadow-lg"

        style={{ scaleX }}

      />



      {/* Back to Top Button */}

      <motion.button

        onClick={scrollToTop}

        initial={{ opacity: 0, y: 100 }}

        animate={{

          opacity: showBackToTop ? 1 : 0,

          y: showBackToTop ? 0 : 100,

        }}

        transition={{ duration: 0.3, ease: "easeOut" }}

        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-green-500 to-green-600 text-white p-2.5 rounded-full shadow-lg hover:shadow-green-500/40 hover:scale-110 transition-all duration-300 group"

        aria-label="Back to top"

      >

        <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-300" />

      </motion.button>



      {/* AI Chatbot Button */}

      <motion.button

        initial={{ opacity: 0, y: 100 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}

        onClick={openAIChatbot}

        className={`fixed bottom-6 z-50 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2.5 rounded-full shadow-lg hover:shadow-purple-500/40 hover:scale-110 transition-all duration-300 group ${

          showBackToTop ? "right-20" : "right-6"

        }`}

        aria-label="AI Chatbot"

        title="Open AI Chatbot"

      >

        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />

      </motion.button>



      <StoreInfoBar />

      <HeroSection />

      <CategorySlider />



      {/* Popular Grocery Items */}

      {renderProductSection("Popular Grocery Items", popularItems)}



      {/* Featured Products */}

      {renderProductSection("Featured Products", featured, "bg-purple-50")}



      {/* Best Sellers */}

      {renderProductSection("Best Sellers", bestSellers, "bg-gray-50")}



      {/* New Arrivals */}

      {renderProductSection("New Arrivals", newArrivals)}



      {/* Category-wise sections - Show only categories that have products */}

      {categories

        .filter((category) => {

          const itemsInCategory = groceries.filter(

            (g: any) => g.category?._id === category._id,

          );

          return itemsInCategory.length > 0;

        })

        .slice(0, 6)

        .map((category, index) => {

          const categoryItems = getGroceriesByCategory(category._id);

          return (

            <div key={category._id}>

              {renderProductSection(

                category.name,

                categoryItems,

                index % 2 === 0 ? "bg-gray-50" : "bg-white",

                category._id,

              )}

            </div>

          );

        })}



      {/* All Products Fallback */}

      {groceries.length === 0 && (

        <div className="w-[90%] md:w-[80%] mx-auto py-12">

          <div className="text-center">

            <p className="text-gray-500 text-lg">No groceries available</p>

          </div>

        </div>

      )}

    </>

  );

};



export default UserDashboard;

