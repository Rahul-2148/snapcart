// src/lib/utils/decrementStock.ts
import { OrderItem } from "@/models/orderItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import mongoose from "mongoose";

/**
 * Decrements the stock count for all variants in a given order.
 * This function is designed to be used within a mongoose transaction.
 * @param orderId - The ID of the order to process.
 * @param session - The mongoose transaction session.
 */
export const decrementStock = async (
  orderId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) => {
  // 1. Get all items from the order
  const orderItems = await OrderItem.find({ order: orderId }).session(session);

  if (!orderItems || orderItems.length === 0) {
    throw new Error("No order items found for the given order ID.");
  }

  // 2. Create an array of update operations
  const bulkUpdateOps = orderItems.map((item) => ({
    updateOne: {
      filter: { _id: item.variant.variantId },
      update: {
        $inc: {
          "countInStock": -item.quantity,
        },
      },
    },
  }));

  // 3. Execute all updates in a single bulk write operation
  const result = await GroceryVariant.bulkWrite(bulkUpdateOps, { session });
  
  if (result.modifiedCount !== orderItems.length) {
    // This check is important. If not all items were modified, it could mean
    // a variant was deleted between order creation and this step, which is unlikely
    // in a transaction but good to have. Or the stock path is wrong.
    console.warn(`Stock decrement warning: Expected to modify ${orderItems.length} variants, but modified ${result.modifiedCount}.`);
  }

  return result;
};
