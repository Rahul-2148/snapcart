// src/redux/features/grocerySlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IGrocery {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  category: {
    _id: string;
    name: string;
    allowedUnits: string[];
  };
  brand?: string;
  images?: {
    url: string;
    publicId: string;
  }[];
  badges?: {
    isBestSeller?: boolean;
    isNew?: boolean;
  };
  isActive?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IGrocerySlice {
  groceries: IGrocery[];
  isLoading: boolean;
}

const initialState: IGrocerySlice = {
  groceries: [],
  isLoading: false,
};

const grocerySlice = createSlice({
  name: "groceries",
  initialState,
  reducers: {
    setGroceries: (state, action: PayloadAction<IGrocery[]>) => {
      state.groceries = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setGroceries } = grocerySlice.actions;
export default grocerySlice.reducer;
