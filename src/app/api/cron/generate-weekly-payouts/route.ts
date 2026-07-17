import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { Payout } from "@/models/payout.model";
import { BankAccount } from "@/models/bankAccount.model";

// Run this via cron every Monday at 00:00 UTC
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDb();

    // Get all delivery partners with pending payouts
    const partners = await DeliveryPartner.find({
      "earnings.pendingPayout": { $gt: 0 },
    }).populate("user");

    console.log(
      `Generating payouts for ${partners.length} partners`,
    );

    let payoutsCreated = 0;

    // Get week start and end
    const now = new Date();
    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const { startDbSession } = await import("@/lib/server/db");

    for (const partner of partners) {
      const user = partner.user as any;
      if (!user) {
        console.log(`Skipping partner ID ${partner._id} - populated user not found`);
        continue;
      }

      const partnerSession = await startDbSession();
      try {
        const primaryBank = await BankAccount.findOne({
          userId: user._id,
          isPrimary: true,
        }).session(partnerSession);

        if (!primaryBank) {
          console.log(`Skipping ${user.name} - no primary bank account`);
          if (partnerSession) await partnerSession.abortTransaction();
          continue;
        }

        // Count deliveries in the week
        const deliveriesThisWeek = partner.stats.totalDeliveries || 0;

        // Calculate deductions
        const cancellationDeduction =
          (partner.stats.cancelledDeliveries || 0) * 50; // ₹50 per cancellation

        const finalAmount = Math.max(
          0,
          partner.earnings.pendingPayout - cancellationDeduction,
        );

        // Create payout record
        await Payout.create(
          [
            {
              deliveryPartner: partner.user,
              amount: finalAmount,
              currency: "INR",
              status: "pending",
              period: {
                startDate: weekStart,
                endDate: weekEnd,
              },
              bankDetails: {
                accountNumber: primaryBank.accountNumber,
                ifsc: primaryBank.ifsc,
                beneficiaryName: primaryBank.beneficiaryName,
              },
              deliveriesCount: deliveriesThisWeek,
              earnedAmount: partner.earnings.pendingPayout,
              deductedAmount: cancellationDeduction,
              notes: `Weekly payout - ${deliveriesThisWeek} deliveries completed`,
            },
          ],
          { session: partnerSession }
        );

        partner.earnings.pendingPayout = 0;
        partner.earnings.lastPayoutAt = new Date();
        await partner.save({ session: partnerSession });

        if (partnerSession) await partnerSession.commitTransaction();
        payoutsCreated++;
        console.log(
          `Created payout for ${user.name}: ₹${finalAmount}`,
        );
      } catch (err) {
        if (partnerSession) await partnerSession.abortTransaction();
        console.error(`Error processing payout for partner ${user.name || partner._id}:`, err);
      } finally {
        if (partnerSession) partnerSession.endSession();
      }
    }

    return NextResponse.json({
      message: "Weekly payouts generated",
      payoutsCreated,
    });
  } catch (error) {
    console.error("[Weekly Payout Cron Error]", error);
    return NextResponse.json(
      { error: "Failed to generate payouts" },
      { status: 500 },
    );
  }
}
