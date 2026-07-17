// src/hooks/cart.api.ts
import axios from "axios";
/* ================= AUTH CART ================= */

export const fetchCartApi = async () => {
  let url = "/api/cart";
  if (typeof window !== "undefined") {
    const groupCode = localStorage.getItem("snapcart_group_code");
    if (groupCode) {
      url += `?groupCode=${encodeURIComponent(groupCode)}`;
    }
  }
  const { data } = await axios.get(url);
  return data;
};

export const addToCartApi = async (variantId: string, quantity = 1) => {
  let groupCode = null;
  let memberId = null;
  let memberName = null;
  if (typeof window !== "undefined") {
    groupCode = localStorage.getItem("snapcart_group_code");
    memberId = localStorage.getItem("snapcart_group_member_id");
    memberName = localStorage.getItem("snapcart_group_member_name");
  }
  const { data } = await axios.post("/api/cart/add", {
    variantId,
    quantity,
    groupCode,
    memberId,
    memberName,
  });
  return data;
};

export const updateCartQuantityApi = async (
  cartItemId: string,
  quantity: number
) => {
  let groupCode = null;
  let memberId = null;
  if (typeof window !== "undefined") {
    groupCode = localStorage.getItem("snapcart_group_code");
    memberId = localStorage.getItem("snapcart_group_member_id");
  }
  const { data } = await axios.patch("/api/cart/update", {
    cartItemId,
    quantity,
    groupCode,
    memberId,
  });
  return data;
};

export const removeFromCartApi = async (cartItemId: string) => {
  let groupCode = null;
  let memberId = null;
  if (typeof window !== "undefined") {
    groupCode = localStorage.getItem("snapcart_group_code");
    memberId = localStorage.getItem("snapcart_group_member_id");
  }
  const res = await fetch("/api/cart/remove", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartItemId, groupCode, memberId }),
  });

  return res.json();
};

export const clearCartApi = async () => {
  let url = "/api/cart/clear";
  if (typeof window !== "undefined") {
    const groupCode = localStorage.getItem("snapcart_group_code");
    const memberId = localStorage.getItem("snapcart_group_member_id");
    if (groupCode && memberId) {
      url += `?groupCode=${encodeURIComponent(groupCode)}&memberId=${encodeURIComponent(memberId)}`;
    }
  }
  const { data } = await axios.delete(url);
  return data;
};

/* ================= GUEST CART (BACKEND COOKIE) ================= */

export const getGuestCart = async () => {
  const { data } = await axios.get("/api/guest-cart");
  return {
    ...data,
    items: data?.cart?.items ?? data?.items ?? [],
  };
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
