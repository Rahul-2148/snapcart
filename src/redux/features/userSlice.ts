// src/redux/features/userSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { IUser } from "../../models/user.model";

interface IUserSlice {
  userData: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: IUserSlice = {
  userData: null,
  isAuthenticated: false,
  isLoading: true,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },

    logout: (state) => {
      state.userData = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUserData, logout } = userSlice.actions;
export default userSlice.reducer;
