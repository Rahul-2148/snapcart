import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { BankAccount } from "@/models/bankAccount.model";
import { User } from "@/models/user.model";
import { NextResponse } from "next/server";
import { isDeliveryPartner } from "@/lib/server/roles";

// GET all bank accounts
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { success: false, message: "Not a delivery partner" },
        { status: 403 }
      );
    }

    // Get all bank accounts
    const banks = await BankAccount.find({ userId: user._id }).sort({ isPrimary: -1, createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        banks: banks || [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching bank details:", error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST - Add new bank account
export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { accountNumber, ifsc, beneficiaryName } = await req.json();

    // Validate inputs
    if (!accountNumber || !ifsc || !beneficiaryName) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (accountNumber.length < 9 || accountNumber.length > 18) {
      return NextResponse.json(
        { success: false, message: "Invalid account number (9-18 digits)" },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return NextResponse.json(
        { success: false, message: "Invalid IFSC code format" },
        { status: 400 }
      );
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { success: false, message: "Not a delivery partner" },
        { status: 403 }
      );
    }

    // Check if this is the first bank account
    const existingBanks = await BankAccount.find({ userId: user._id });
    const isPrimary = existingBanks.length === 0;

    // Create new bank account
    const newBank = await BankAccount.create({
      userId: user._id,
      accountNumber,
      ifsc: ifsc.toUpperCase(),
      beneficiaryName,
      isPrimary,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Bank account added successfully",
        bank: newBank,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving bank details:", error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

// PUT - Update primary bank
export async function PUT(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { bankId, isPrimary } = await req.json();

    if (!bankId) {
      return NextResponse.json(
        { success: false, message: "Bank ID is required" },
        { status: 400 }
      );
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { success: false, message: "Not a delivery partner" },
        { status: 403 }
      );
    }

    // Remove primary from all banks
    await BankAccount.updateMany(
      { userId: user._id },
      { $set: { isPrimary: false } }
    );

    // Set new primary
    const updatedBank = await BankAccount.findOneAndUpdate(
      { _id: bankId, userId: user._id },
      { $set: { isPrimary: true } },
      { new: true }
    );

    if (!updatedBank) {
      return NextResponse.json(
        { success: false, message: "Bank account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Primary bank updated successfully",
        bank: updatedBank,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating bank:", error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove bank account
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get('bankId');

    if (!bankId) {
      return NextResponse.json(
        { success: false, message: "Bank ID is required" },
        { status: 400 }
      );
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { success: false, message: "Not a delivery partner" },
        { status: 403 }
      );
    }

    // Check if bank is primary
    const bank = await BankAccount.findOne({ _id: bankId, userId: user._id });
    if (!bank) {
      return NextResponse.json(
        { success: false, message: "Bank account not found" },
        { status: 404 }
      );
    }

    if (bank.isPrimary) {
      return NextResponse.json(
        { success: false, message: "Cannot delete primary bank. Set another bank as primary first." },
        { status: 400 }
      );
    }

    await BankAccount.deleteOne({ _id: bankId, userId: user._id });

    return NextResponse.json(
      {
        success: true,
        message: "Bank account deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting bank:", error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}
