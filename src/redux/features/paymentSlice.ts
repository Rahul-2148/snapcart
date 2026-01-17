// src/redux/features/paymentSlice.ts
import { createSlice } from "@reduxjs/toolkit";

interface PaymentState {
  paymentMethods: {
    type: "razorpay" | "stripe" | "cod";
    lastUsed: Date;
    saved: boolean;
  }[];
  transactions: any[];
  currentTransaction: any | null;
  loading: boolean;
}

const initialState: PaymentState = {
  paymentMethods: [],
  transactions: [],
  currentTransaction: null,
  loading: false,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload;
    },
    addTransaction: (state, action) => {
      state.transactions.unshift(action.payload);
    },
    updateTransactionStatus: (state, action) => {
      const { transactionId, status } = action.payload;
      const transaction = state.transactions.find(
        (t) => t._id === transactionId
      );
      if (transaction) {
        transaction.status = status;
      }
    },
  },
});

export const {
  setCurrentTransaction,
  addTransaction,
  updateTransactionStatus,
} = paymentSlice.actions;
export default paymentSlice.reducer;
