// src/components/UserDashboard.tsx
"use client";

import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";

import CategorySlider from "./CategorySlider";
import HeroSection from "./HeroSection";
import GroceryItemCard from "./GroceryItemCard";

import { setGroceries } from "@/redux/features/grocerySlice";
import { AppDispatch, RootState } from "@/redux/store";

const UserDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();

  // groceries redux se aayega
  const { groceries } = useSelector(
    (state: RootState) => state.grocery
  );

  useEffect(() => {
    const getGroceries = async () => {
      try {
        const response = await axios.get("/api/groceries");
        dispatch(setGroceries(response.data.groceries));
      } catch (error) {
        console.error("Error fetching groceries:", error);
      }
    };

    getGroceries();
  }, [dispatch]);

  return (
    <>
      <HeroSection />
      <CategorySlider />
      <div className="w-[90%] md:w-[80%] mx-auto mt-10">
        <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-6 text-center">
          Popular Grocery Items
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {groceries.map((grocery, index) => (
            <GroceryItemCard key={index} grocery={grocery} />
          ))}
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
