// src/redux/features/locationSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// ─── Types ───────────────────────────────────────────────────────────
export interface NearbyStore {
  _id: string;
  name: string;
  slug: string;
  distanceKm: number;
  isOpen: boolean;
  status: string;
  deliveryFee: { base: number; freeAbove: number };
  estimatedDeliveryMinutes: { min: number; max: number };
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: [number, number];
  };
  serviceRadiusKm: number;
}

export interface SelectedStore {
  _id: string;
  name: string;
  slug: string;
  distanceKm: number;
  isOpen: boolean;
  deliveryFee: { base: number; freeAbove: number };
  estimatedDeliveryMinutes: { min: number; max: number };
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export type ServiceableStatus =
  | "serviceable"
  | "limited"
  | "not_serviceable"
  | "checking"
  | "unknown";

export type PermissionStatus =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

export type LocationSource = "gps" | "manual" | "saved" | null;

// ─── Persisted Location Data ─────────────────────────────────────────
export interface PersistedLocation {
  latitude: number;
  longitude: number;
  fullAddress: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  lastUpdated: number;
  source: LocationSource;
}

export interface PersistedStore {
  _id: string;
  name: string;
  distanceKm: number;
  eta: { min: number; max: number };
}

// ─── State ───────────────────────────────────────────────────────────
interface LocationState {
  // Coordinates
  latitude: number | null;
  longitude: number | null;

  // Parsed address
  fullAddress: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;

  // Permission & loading
  permissionStatus: PermissionStatus;
  isDetecting: boolean;
  isReverseGeocoding: boolean;
  isFetchingStores: boolean;
  error: string | null;

  // Stores
  selectedStore: SelectedStore | null;
  nearbyStores: NearbyStore[];

  // Serviceability
  serviceableStatus: ServiceableStatus;

  // Persistence
  lastUpdated: number | null;
  source: LocationSource;

  // UI
  isLocationPickerOpen: boolean;
  isPermissionPromptShown: boolean;
  hasInitialized: boolean;
}

// ─── localStorage Keys ───────────────────────────────────────────────
const LOCATION_STORAGE_KEY = "snapcart_location";
const STORE_STORAGE_KEY = "snapcart_selected_store";
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// ─── Helper: localStorage ────────────────────────────────────────────
function saveLocationToStorage(data: PersistedLocation): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // localStorage might be full or blocked
  }
}

function loadLocationFromStorage(): PersistedLocation | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoreToStorage(data: PersistedStore): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // silent fail
  }
}

function loadStoreFromStorage(): PersistedStore | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Initial State ───────────────────────────────────────────────────
const initialState: LocationState = {
  latitude: null,
  longitude: null,
  fullAddress: "",
  area: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  permissionStatus: "prompt",
  isDetecting: false,
  isReverseGeocoding: false,
  isFetchingStores: false,
  error: null,
  selectedStore: null,
  nearbyStores: [],
  serviceableStatus: "unknown",
  lastUpdated: null,
  source: null,
  isLocationPickerOpen: false,
  isPermissionPromptShown: false,
  hasInitialized: false,
};

// ─── Async Thunks ────────────────────────────────────────────────────

/** Reverse-geocode coordinates via our API */
export const reverseGeocodeCoords = createAsyncThunk(
  "location/reverseGeocode",
  async (
    { lat, lng }: { lat: number; lng: number },
    { rejectWithValue },
  ) => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();

      const addr = data.address || {};
      return {
        fullAddress: data.display_name || "",
        area:
          addr.suburb ||
          addr.neighbourhood ||
          addr.hamlet ||
          addr.village ||
          addr.town ||
          "",
        city:
          addr.city ||
          addr.town ||
          addr.village ||
          addr.county ||
          addr.state_district ||
          "",
        state: addr.state || "",
        country: addr.country || "India",
        pincode: addr.postcode || "",
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Reverse geocoding failed");
    }
  },
);

/** Fetch nearby stores based on coordinates */
export const fetchNearbyStores = createAsyncThunk(
  "location/fetchNearbyStores",
  async (
    { lat, lng, radiusKm }: { lat: number; lng: number; radiusKm?: number },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
      });
      if (radiusKm) params.set("radiusKm", radiusKm.toString());

      const res = await fetch(`/api/stores/nearby?${params}`);
      if (!res.ok) throw new Error("Failed to fetch nearby stores");
      const data = await res.json();

      return {
        stores: (data.stores || []) as NearbyStore[],
        serviceableStatus: (data.serviceableStatus ||
          "unknown") as ServiceableStatus,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch stores");
    }
  },
);

// ─── Slice ───────────────────────────────────────────────────────────
const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    /** Hydrate from localStorage — call on app mount */
    hydrateFromStorage(state) {
      const savedLoc = loadLocationFromStorage();
      const savedStore = loadStoreFromStorage();

      if (savedLoc) {
        state.latitude = savedLoc.latitude;
        state.longitude = savedLoc.longitude;
        state.fullAddress = savedLoc.fullAddress;
        state.area = savedLoc.area;
        state.city = savedLoc.city;
        state.state = savedLoc.state;
        state.country = savedLoc.country;
        state.pincode = savedLoc.pincode;
        state.lastUpdated = savedLoc.lastUpdated;
        state.source = savedLoc.source;
      }

      if (savedStore) {
        state.selectedStore = {
          _id: savedStore._id,
          name: savedStore.name,
          slug: "",
          distanceKm: savedStore.distanceKm,
          isOpen: true,
          deliveryFee: { base: 25, freeAbove: 500 },
          estimatedDeliveryMinutes: savedStore.eta,
          location: { address: "", city: "", state: "", pincode: "" },
        };
        state.serviceableStatus = "serviceable";
      }

      state.hasInitialized = true;
    },

    /** Set location from GPS or manual input */
    setLocation(
      state,
      action: PayloadAction<{
        latitude: number;
        longitude: number;
        fullAddress: string;
        area: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
        source: LocationSource;
      }>,
    ) {
      const p = action.payload;
      state.latitude = p.latitude;
      state.longitude = p.longitude;
      state.fullAddress = p.fullAddress;
      state.area = p.area;
      state.city = p.city;
      state.state = p.state;
      state.country = p.country;
      state.pincode = p.pincode;
      state.source = p.source;
      state.lastUpdated = Date.now();
      state.error = null;

      // Persist
      saveLocationToStorage({
        latitude: p.latitude,
        longitude: p.longitude,
        fullAddress: p.fullAddress,
        area: p.area,
        city: p.city,
        state: p.state,
        country: p.country,
        pincode: p.pincode,
        lastUpdated: Date.now(),
        source: p.source,
      });
    },

    setPermissionStatus(state, action: PayloadAction<PermissionStatus>) {
      state.permissionStatus = action.payload;
    },

    setDetecting(state, action: PayloadAction<boolean>) {
      state.isDetecting = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isDetecting = false;
    },

    setSelectedStore(state, action: PayloadAction<SelectedStore | null>) {
      state.selectedStore = action.payload;
      if (action.payload) {
        saveStoreToStorage({
          _id: action.payload._id,
          name: action.payload.name,
          distanceKm: action.payload.distanceKm,
          eta: action.payload.estimatedDeliveryMinutes,
        });
      }
    },

    setServiceableStatus(state, action: PayloadAction<ServiceableStatus>) {
      state.serviceableStatus = action.payload;
    },

    setLocationPickerOpen(state, action: PayloadAction<boolean>) {
      state.isLocationPickerOpen = action.payload;
    },

    setPermissionPromptShown(state, action: PayloadAction<boolean>) {
      state.isPermissionPromptShown = action.payload;
    },

    clearLocation(state) {
      Object.assign(state, {
        ...initialState,
        hasInitialized: true,
        permissionStatus: state.permissionStatus,
      });
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          localStorage.removeItem(STORE_STORAGE_KEY);
        }
      } catch {
        // silent
      }
    },

    /** Check if saved location is stale and needs refresh */
    checkStale(state) {
      if (
        state.lastUpdated &&
        Date.now() - state.lastUpdated > STALE_THRESHOLD_MS
      ) {
        // Mark as needing refresh — the LocationInitializer will re-detect
        state.source = null;
      }
    },
  },

  extraReducers: (builder) => {
    // reverseGeocodeCoords
    builder
      .addCase(reverseGeocodeCoords.pending, (state) => {
        state.isReverseGeocoding = true;
      })
      .addCase(reverseGeocodeCoords.fulfilled, (state, action) => {
        state.isReverseGeocoding = false;
        state.fullAddress = action.payload.fullAddress;
        state.area = action.payload.area;
        state.city = action.payload.city;
        state.state = action.payload.state;
        state.country = action.payload.country;
        state.pincode = action.payload.pincode;
        state.lastUpdated = Date.now();

        // Persist updated address
        if (state.latitude !== null && state.longitude !== null) {
          saveLocationToStorage({
            latitude: state.latitude,
            longitude: state.longitude,
            fullAddress: action.payload.fullAddress,
            area: action.payload.area,
            city: action.payload.city,
            state: action.payload.state,
            country: action.payload.country,
            pincode: action.payload.pincode,
            lastUpdated: Date.now(),
            source: state.source,
          });
        }
      })
      .addCase(reverseGeocodeCoords.rejected, (state, action) => {
        state.isReverseGeocoding = false;
        state.error = action.payload as string;
      });

    // fetchNearbyStores
    builder
      .addCase(fetchNearbyStores.pending, (state) => {
        state.isFetchingStores = true;
        state.serviceableStatus = "checking";
      })
      .addCase(fetchNearbyStores.fulfilled, (state, action) => {
        state.isFetchingStores = false;
        state.nearbyStores = action.payload.stores;
        state.serviceableStatus = action.payload.serviceableStatus;

        // Auto-select nearest serviceable store
        const openStores = action.payload.stores.filter(
          (s) => s.isOpen && s.status === "active",
        );
        if (openStores.length > 0) {
          const nearest = openStores[0]; // Already sorted by distance from API
          const store: SelectedStore = {
            _id: nearest._id,
            name: nearest.name,
            slug: nearest.slug,
            distanceKm: nearest.distanceKm,
            isOpen: nearest.isOpen,
            deliveryFee: nearest.deliveryFee,
            estimatedDeliveryMinutes: nearest.estimatedDeliveryMinutes,
            location: {
              address: nearest.location.address,
              city: nearest.location.city,
              state: nearest.location.state,
              pincode: nearest.location.pincode,
            },
          };
          state.selectedStore = store;
          state.serviceableStatus = "serviceable";
          saveStoreToStorage({
            _id: store._id,
            name: store.name,
            distanceKm: store.distanceKm,
            eta: store.estimatedDeliveryMinutes,
          });
        } else if (action.payload.stores.length > 0) {
          // Stores exist but none are open
          state.serviceableStatus = "limited";
          state.selectedStore = null;
        } else {
          state.serviceableStatus = "not_serviceable";
          state.selectedStore = null;
        }
      })
      .addCase(fetchNearbyStores.rejected, (state, action) => {
        state.isFetchingStores = false;
        state.serviceableStatus = "unknown";
        state.error = action.payload as string;
      });
  },
});

export const {
  hydrateFromStorage,
  setLocation,
  setPermissionStatus,
  setDetecting,
  setError,
  setSelectedStore,
  setServiceableStatus,
  setLocationPickerOpen,
  setPermissionPromptShown,
  clearLocation,
  checkStale,
} = locationSlice.actions;

export default locationSlice.reducer;

// ─── Selectors ───────────────────────────────────────────────────────
export const selectLocation = (state: RootState) => state.location;
export const selectSelectedStore = (state: RootState) =>
  state.location.selectedStore;
export const selectServiceableStatus = (state: RootState) =>
  state.location.serviceableStatus;
export const selectIsLocationReady = (state: RootState) =>
  state.location.latitude !== null && state.location.longitude !== null;
export const selectLocationDisplayText = (state: RootState) => {
  const loc = state.location;
  if (loc.area && loc.city) return `${loc.area}, ${loc.city}`;
  if (loc.city) return loc.city;
  if (loc.fullAddress) {
    // Truncate long addresses
    return loc.fullAddress.length > 40
      ? loc.fullAddress.slice(0, 40) + "..."
      : loc.fullAddress;
  }
  return "";
};
