// src/redux/features/orderSlice.ts
import { createSlice } from "@reduxjs/toolkit";

interface OrderItem {
  _id: string;
  variant: {
    label: string;
    unit: string;
  };
  quantity: number;
  price: {
    sellingPrice: number;
    mrpPrice: number;
  };
}

interface OrderState {
  currentOrder: {
    _id: string;
    orderNumber: string;
    status: string;
    items: OrderItem[];
    total: number;
    deliveryAddress: any;
  } | null;
  orders: any[];
  loading: boolean;
}

const initialState: OrderState = {
  currentOrder: null,
  orders: [],
  loading: false,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
    setOrders: (state, action) => {
      state.orders = action.payload;
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      if (state.currentOrder?._id === orderId) {
        state.currentOrder!.status = status;
      }
      const order = state.orders.find((o) => o._id === orderId);
      if (order) {
        order.status = status;
      }
    },
  },
});

export const { setCurrentOrder, setOrders, updateOrderStatus } = orderSlice.actions;
export default orderSlice.reducer;