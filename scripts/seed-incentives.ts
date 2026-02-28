import { config } from "dotenv";

config({ path: ".env.local" });

const seed = async () => {
  const [{ default: connectDb }, { DeliveryIncentive }] = await Promise.all([
    import("@/lib/server/db"),
    import("@/models/deliveryIncentive.model"),
  ]);

  await connectDb();

  const now = new Date();
  const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const existing = await DeliveryIncentive.countDocuments();
  if (existing > 0) {
    console.log("Incentives already exist. Skipping seed.");
    return;
  }

  await DeliveryIncentive.insertMany([
    {
      title: "Lunch Rush Bonus",
      description: "Complete 5 deliveries between now and 2 hours for bonus.",
      targetDeliveries: 5,
      rewardAmount: 150,
      startAt: now,
      endAt: in2Hours,
      isActive: true,
    },
    {
      title: "Evening Sprint",
      description: "Earn ₹1200+ in deliveries within 6 hours.",
      targetEarnings: 1200,
      rewardAmount: 250,
      startAt: now,
      endAt: in6Hours,
      isActive: true,
    },
    {
      title: "Daily Streak",
      description: "Complete 12 deliveries by tomorrow.",
      targetDeliveries: 12,
      rewardAmount: 400,
      startAt: now,
      endAt: tomorrow,
      isActive: true,
    },
  ]);

  console.log("Seeded incentives.");
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
