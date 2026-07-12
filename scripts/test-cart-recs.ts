// scripts/test-cart-recs.ts
import connectDb from "../src/lib/server/db";

async function test() {
  const cartItems = [
    {
      variant: {
        _id: "69d7ce39f533b583dfa181c3", // Amul Milk variant
        grocery: {
          _id: "69d7ce39f533b583dfa181b8", // Amul Milk grocery
          category: "69872edf5ed0786641a6d562" // Dairy & Eggs category
        }
      }
    }
  ];

  try {
    const res = await fetch("http://localhost:3000/api/recommendations/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItems })
    });
    
    const data = await res.json();
    console.log("=== Cart Recommendations Response ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
