import { configureStore } from "@reduxjs/toolkit";

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import cartSlice from "./features/cartSlice";

import userSlice from "./features/userSlice";

import grocerySlice from "./features/grocerySlice";

import orderSlice from "./features/orderSlice";

import paymentSlice from "./features/paymentSlice";

import locationSlice from "./features/locationSlice";

import storeSlice from "./features/storeSlice";



export const store = configureStore({

  reducer: {

    user: userSlice,

    grocery: grocerySlice,

    cart: cartSlice,

    order: orderSlice,

    payment: paymentSlice,

    location: locationSlice,

    store: storeSlice,

  },

});



export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;



export const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

