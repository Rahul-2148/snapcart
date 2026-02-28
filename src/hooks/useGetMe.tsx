"use client";

import { setUserData } from "@/redux/features/userSlice";
import { AppDispatch } from "@/redux/store";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useSocket } from "@/contexts/SocketContext";

const useGetMe = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: session, status } = useSession();
  const socket = useSocket();
  const hasJoinedRoom = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      // Reset room join flag on logout
      hasJoinedRoom.current = false;
      return;
    }

    const getMe = async () => {
      try {
        const result = await axios.get("/api/me");
        
        if (result.data.success) {
          dispatch(setUserData(result.data.user));
          
          // Join socket room once after user data is loaded (prevent duplicates)
          if (socket && result.data.user._id && !hasJoinedRoom.current) {
            socket.emit(
              "join_user_room",
              result.data.user._id,
              result.data.user.name,
              result.data.user.currentRole,
            );
            if (result.data.user.currentRole === "admin") {
              socket.emit(
                "join_admin_room",
                result.data.user._id,
                result.data.user.name,
                result.data.user.currentRole,
              );
            }
            hasJoinedRoom.current = true;
          }
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Clear user data if user not found
          dispatch(setUserData(null));
        } else {
          console.error("Error fetching user data:", error);
        }
      }
    };
    
    getMe();
  }, [dispatch, status, session, socket]);
};

export default useGetMe;
