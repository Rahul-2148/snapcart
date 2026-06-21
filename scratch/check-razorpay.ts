import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config({ path: "c:/Users/Rahul Raj Modi/OneDrive/Desktop/Full stack Projects/snapcart-Grocery Next.js/.env.local" });

async function main() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("Razorpay keys not defined in env");
    process.exit(1);
  }

  console.log("Initializing Razorpay client with:", { keyId, keySecret: "***" });
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    console.log("Fetching orders from Razorpay...");
    const orders = await razorpay.orders.all({ count: 1 });
    console.log("Razorpay credentials are VALID!");
    console.log("Orders found:", orders);
  } catch (error: any) {
    console.error("Razorpay validation FAILED:", error.message || error);
  }
}

main();
