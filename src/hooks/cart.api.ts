// src/hooks/cart.api.ts
import axios from "axios";
/* ================= AUTH CART ================= */

export const fetchCartApi = async () => {
  const { data } = await axios.get("/api/cart");
  return data;
};

export const addToCartApi = async (variantId: string, quantity = 1) => {
  const { data } = await axios.post("/api/cart/add", { variantId, quantity });
  return data;
};

export const updateCartQuantityApi = async (
  cartItemId: string,
  quantity: number
) => {
  const { data } = await axios.patch("/api/cart/update", {
    cartItemId,
    quantity,
  });
  return data;
};

export const removeFromCartApi = async (cartItemId: string) => {
  const res = await fetch("/api/cart/remove", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartItemId }),
  });

  return res.json();
};

export const clearCartApi = async () => {
  const { data } = await axios.delete("/api/cart/clear");
  return data;
}

/* ================= GUEST CART (BACKEND COOKIE) ================= */

export const getGuestCart = async () => {
  const { data } = await axios.get("/api/guest-cart");
  return data;
};

export const addGuestCartApi = async (variantId: string, quantity: number) => {
  const { data } = await axios.post("/api/guest-cart", {
    variantId,
    quantity,
  });
  return data;
};

export const updateGuestCartApi = async (
  variantId: string,
  quantity: number
) => {
  const { data } = await axios.patch("/api/guest-cart", {
    variantId,
    quantity,
  });
  return data;
};

export const clearGuestCart = async () => {
  await axios.delete("/api/guest-cart");
};

/* ================= MERGE ================= */

export const mergeGuestCartApi = async (items: any[]) => {
  await axios.post("/api/cart/merge", { items });
};
