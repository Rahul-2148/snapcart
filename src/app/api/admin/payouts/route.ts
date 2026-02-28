import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Payout } from "@/models/payout.model";
import { User } from "@/models/user.model";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
}) as any;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || session.user.currentRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get("status") || "pending";
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const query = req.nextUrl.searchParams.get("q") || "";
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");
    const minAmount = req.nextUrl.searchParams.get("minAmount");
    const maxAmount = req.nextUrl.searchParams.get("maxAmount");
    const exportCsv = req.nextUrl.searchParams.get("export") === "csv";

    await connectDb();

    const filter: Record<string, any> = { status };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        filter.amount.$gte = Number(minAmount);
      }
      if (maxAmount) {
        filter.amount.$lte = Number(maxAmount);
      }
    }

    if (query.trim()) {
      const q = query.trim();
      const users = await User.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { mobileNumber: { $regex: q, $options: "i" } },
        ],
      }).select("_id");

      const ids = users.map((u) => u._id);
      if (ids.length === 0) {
        return NextResponse.json({
          payouts: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      filter.deliveryPartner = { $in: ids };
    }

    const baseQuery = Payout.find(filter).populate({
      path: "deliveryPartner",
      select: "name email mobileNumber",
      model: "User",
    });

    if (exportCsv) {
      const rows = await baseQuery.sort({ createdAt: -1 });

      const escapeCsv = (value: unknown) => {
        const str = String(value ?? "");
        if (/[",\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const header = [
        "Partner Name",
        "Partner Email",
        "Partner Phone",
        "Amount",
        "Status",
        "Period Start",
        "Period End",
        "Created At",
        "Transaction Id",
        "Failure Reason",
        "Notes",
      ];

      const lines = [header.join(",")];

      for (const payout of rows) {
        const partner = payout.deliveryPartner as any;
        lines.push(
          [
            escapeCsv(partner?.name),
            escapeCsv(partner?.email),
            escapeCsv(partner?.mobileNumber),
            payout.amount,
            payout.status,
            payout.period?.startDate
              ? new Date(payout.period.startDate).toISOString()
              : "",
            payout.period?.endDate
              ? new Date(payout.period.endDate).toISOString()
              : "",
            payout.createdAt ? new Date(payout.createdAt).toISOString() : "",
            escapeCsv(payout.transactionId),
            escapeCsv(payout.failureReason),
            escapeCsv(payout.notes),
          ].join(","),
        );
      }

      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=delivery-payouts.csv",
        },
      });
    }

    const payouts = await baseQuery
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Payout.countDocuments(filter);

    return NextResponse.json({
      payouts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Payout Fetch Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || session.user.currentRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, payoutIds } = await req.json();

    if (!action || !Array.isArray(payoutIds) || payoutIds.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await connectDb();

    if (action === "release") {
      // Mark payouts as processing
      const result = await Payout.updateMany(
        {
          _id: { $in: payoutIds },
          status: "pending",
        },
        {
          $set: {
            status: "processing",
            processedAt: new Date(),
          },
        },
      );

      return NextResponse.json({
        message: "Payouts marked for processing",
        modified: result.modifiedCount,
      });
    }

    if (action === "complete") {
      // Mark payouts as completed with Razorpay payout processing
      const payouts = await Payout.find({
        _id: { $in: payoutIds },
        status: "processing",
      }).populate("deliveryPartner");

      const updateResults = [];

      for (const payout of payouts) {
        try {
          const deliveryPartner = payout.deliveryPartner as any;

          // Validate bank details from payout snapshot
          if (
            !payout.bankDetails?.accountNumber ||
            !payout.bankDetails?.ifsc
          ) {
            updateResults.push({
              payoutId: payout._id,
              status: "failed",
              error: "Missing bank details",
            });
            continue;
          }

          const hasRazorpayKeys =
            !!process.env.RAZORPAY_KEY_ID &&
            !!process.env.RAZORPAY_KEY_SECRET &&
            !!process.env.RAZORPAY_ACCOUNT_NUMBER;

          // Process payout via Razorpay if configured, otherwise mark as completed manually
          try {
            if (hasRazorpayKeys) {
              const payoutResponse = await razorpay.payouts.create({
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
                amount: payout.amount * 100, // Convert to paise
                currency: "INR",
                mode: "NEFT",
                purpose: "payout",
                recipient: {
                  name: deliveryPartner?.name || "Delivery Partner",
                  email: deliveryPartner?.email,
                  contact: deliveryPartner?.mobileNumber,
                  account_number: payout.bankDetails.accountNumber,
                  ifsc: payout.bankDetails.ifsc,
                },
                reference_id: `payout_${payout._id}`,
                narration: `Snapcart Delivery Earnings - ${payout.period.startDate.toLocaleDateString()}`,
                notes: {
                  payoutId: payout._id.toString(),
                  deliveryPartnerId: deliveryPartner?._id?.toString(),
                  deliveries: payout.deliveriesCount,
                },
              });

              payout.status = "completed";
              payout.completedAt = new Date();
              payout.transactionId = payoutResponse.id;
              await payout.save();

              updateResults.push({
                payoutId: payout._id,
                status: "completed",
                transactionId: payoutResponse.id,
              });
            } else {
              payout.status = "completed";
              payout.completedAt = new Date();
              payout.transactionId = `manual_${payout._id}`;
              await payout.save();

              updateResults.push({
                payoutId: payout._id,
                status: "completed",
                transactionId: payout.transactionId,
              });
            }
          } catch (razorpayError: any) {
            payout.status = "failed";
            payout.failureReason = `Razorpay Error: ${razorpayError.message}`;
            await payout.save();

            updateResults.push({
              payoutId: payout._id,
              status: "failed",
              error: razorpayError.message,
            });
          }
        } catch (error: any) {
          updateResults.push({
            payoutId: payout._id,
            status: "failed",
            error: error.message,
          });
        }
      }

      return NextResponse.json({
        message: "Payouts processed",
        results: updateResults,
        successful: updateResults.filter((r) => r.status === "completed")
          .length,
        failed: updateResults.filter((r) => r.status === "failed").length,
      });
    }

    if (action === "reject") {
      const result = await Payout.updateMany(
        {
          _id: { $in: payoutIds },
          status: "pending",
        },
        {
          $set: {
            status: "failed",
            failureReason: "Rejected by admin",
            processedAt: new Date(),
          },
        },
      );

      return NextResponse.json({
        message: "Payouts rejected",
        modified: result.modifiedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Payout Action Error]", error);
    return NextResponse.json(
      { error: "Failed to process payouts" },
      { status: 500 },
    );
  }
}
