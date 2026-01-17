import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Address from "@/models/address.model";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const addresses = await Address.find({ user: user._id });

    return NextResponse.json({ addresses }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { message: `Error fetching addresses: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { street, city, state, zipCode, country, type } = await req.json();

    const newAddress = new Address({
      user: user._id,
      street,
      city,
      state,
      zipCode,
      country,
      type,
    });

    await newAddress.save();

    return NextResponse.json({ address: newAddress }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { message: `Error creating address: ${error.message}` },
      { status: 500 }
    );
  }
}
