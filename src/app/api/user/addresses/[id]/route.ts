import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Address from "@/models/address.model";

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
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

    const body = await req.json();
    const { street, city, state, zipCode, country, type } = body;

    const address = await Address.findByIdAndUpdate(
      id,
      { user: user._id, street, city, state, zipCode, country, type },
      { new: true }
    );

    if (!address) {
      return NextResponse.json(
        { message: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ address }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { message: `Error updating address: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
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

    const address = await Address.findByIdAndDelete(id);

    if (!address) {
      return NextResponse.json(
        { message: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Address deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { message: `Error deleting address: ${error.message}` },
      { status: 500 }
    );
  }
}
