"use client";

import { setUserData } from "@/redux/features/userSlice";
import { AppDispatch } from "@/redux/store";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetMe = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const getMe = async () => {
      try {
        const result = await axios.get("/api/me");
        // console.log(result.data);
        dispatch(setUserData(result.data.user));
      } catch (error) {
        console.log(error);
      }
    };
    getMe();
  }, []);
};

export default useGetMe;
