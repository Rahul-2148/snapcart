// src/redux/features/storeSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// ─── Types ───────────────────────────────────────────────────────────
interface StoreGrocery {
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
  images?: { url: string; publicId: string }[];
  badges?: {
    isBestSeller?: boolean;
    isNew?: boolean;
    isFeatured?: boolean;
  };
  isActive?: boolean;
  variants?: any[];
}

interface StoreCategory {
  _id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface StoreState {
  storeGroceries: StoreGrocery[];
  storeCategories: StoreCategory[];
  isLoadingInventory: boolean;
  inventoryError: string | null;
  currentStoreId: string | null;
  deliveryEta: { min: number; max: number } | null;
  usingGlobalFallback: boolean;
}

const initialState: StoreState = {
  storeGroceries: [],
  storeCategories: [],
  isLoadingInventory: false,
  inventoryError: null,
  currentStoreId: null,
  deliveryEta: null,
  usingGlobalFallback: false,
};

// ─── Async Thunks ────────────────────────────────────────────────────

/** Fetch products from a specific store's inventory */
export const fetchStoreInventory = createAsyncThunk(
  "store/fetchInventory",
  async (
    {
      storeId,
      category,
      search,
    }: { storeId: string; category?: string; search?: string },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);

      const url = `/api/products/by-store/${storeId}${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch store inventory");
      const data = await res.json();

      return {
        groceries: (data.groceries || []) as StoreGrocery[],
        categories: (data.categories || []) as StoreCategory[],
        usingFallback: data.usingFallback || false,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch store inventory");
    }
  },
);

/** Fetch delivery ETA for a store and coordinates */
export const fetchDeliveryEta = createAsyncThunk(
  "store/fetchEta",
  async (
    {
      storeId,
      lat,
      lng,
    }: { storeId: string; lat: number; lng: number },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        storeId,
        lat: lat.toString(),
        lng: lng.toString(),
      });
      const res = await fetch(`/api/delivery/eta?${params}`);
      if (!res.ok) throw new Error("Failed to fetch ETA");
      const data = await res.json();
      return { min: data.min, max: data.max } as { min: number; max: number };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch ETA");
    }
  },
);

// ─── Slice ───────────────────────────────────────────────────────────
const storeSlice = createSlice({
  name: "store",
  initialState,
  reducers: {
    clearStoreInventory(state) {
      state.storeGroceries = [];
      state.storeCategories = [];
      state.currentStoreId = null;
      state.inventoryError = null;
      state.usingGlobalFallback = false;
    },
    setDeliveryEta(
      state,
      action: PayloadAction<{ min: number; max: number } | null>,
    ) {
      state.deliveryEta = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchStoreInventory.pending, (state) => {
        state.isLoadingInventory = true;
        state.inventoryError = null;
      })
      .addCase(fetchStoreInventory.fulfilled, (state, action) => {
        state.isLoadingInventory = false;
        state.storeGroceries = action.payload.groceries;
        state.storeCategories = action.payload.categories;
        state.usingGlobalFallback = action.payload.usingFallback;
        state.currentStoreId = action.meta.arg.storeId;
      })
      .addCase(fetchStoreInventory.rejected, (state, action) => {
        state.isLoadingInventory = false;
        state.inventoryError = action.payload as string;
      });

    builder
      .addCase(fetchDeliveryEta.fulfilled, (state, action) => {
        state.deliveryEta = action.payload;
      })
      .addCase(fetchDeliveryEta.rejected, (state) => {
        state.deliveryEta = null;
      });
  },
});

export const { clearStoreInventory, setDeliveryEta } = storeSlice.actions;
export default storeSlice.reducer;
