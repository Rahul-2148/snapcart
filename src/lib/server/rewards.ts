import Reward from "@/models/reward.model";
import mongoose from "mongoose";

/**
 * Awards SnapCoins and an unscratched scratchcard to the user upon order confirmation.
 * SnapCoins rate: 1 coin per ₹100 spent.
 */
export const awardLoyaltyRewards = async (
  userId: string | mongoose.Types.ObjectId,
  orderId: string,
  subTotal: number,
  dbSession?: any
) => {
  try {
    const coinsEarned = Math.floor(subTotal / 100);
    
    let reward = await Reward.findOne({ userId }).session(dbSession);
    if (!reward) {
      reward = new Reward({
        userId,
        coins: 0,
        scratchCards: [],
      });
    }

    // Only increment coins if positive
    if (coinsEarned > 0) {
      reward.coins += coinsEarned;
    }
    
    // Push a new unscratched card
    reward.scratchCards.push({
      _id: new mongoose.Types.ObjectId(),
      status: "unscratched",
      value: 0,
      earnedForOrder: orderId,
      createdAt: new Date(),
    });

    await reward.save({ session: dbSession });
  } catch (err) {
    console.error("Error awarding loyalty rewards:", err);
  }
};
