import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroupCart } from "@/models/groupCart.model";

// FORCE model registration
import "@/models/groceryVariant.model";
import "@/models/grocery.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    // Check if groupCode is provided in query params or headers
    const { searchParams } = new URL(req.url);
    const groupCode = searchParams.get("groupCode") || req.headers.get("x-group-code");

    let cart;
    let isGroupCart = false;
    let groupSession = null;

    if (groupCode && groupCode.trim() !== "") {
      // Find the active group session
      groupSession = await GroupCart.findOne({ code: groupCode.trim().toUpperCase(), isActive: true })
        .populate("host", "name");
        
      if (!groupSession) {
        return NextResponse.json(
          { success: false, message: "Group session not found or inactive" },
          { status: 404 }
        );
      }

      // Find the host's cart
      cart = await Cart.findOne({ user: groupSession.host });
      if (!cart) {
        cart = await Cart.create({ user: groupSession.host });
      }
      isGroupCart = true;
    } else {
      // Normal flow: require authenticated user
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      cart = await Cart.findOne({ user: session.user.id });
    }

    if (!cart) {
      return NextResponse.json({
        success: true,
        cart: null,
        items: [],
        coupon: null,
      });
    }

    const items = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: {
        path: "grocery",
        select: "name images category",
        populate: { path: "category", select: "name" },
      },
    });

    let isGoldMember = false;
    if (!isGroupCart) {
      const session = await auth();
      if (session?.user?.id) {
        const { User } = await import("@/models/user.model");
        const userObj = await User.findById(session.user.id).select("isGoldMember goldExpiryDate").lean();
        if (userObj?.isGoldMember && userObj.goldExpiryDate && new Date(userObj.goldExpiryDate) > new Date()) {
          isGoldMember = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      cart: isGroupCart ? { _id: cart._id, isGroup: true, groupCode, host: groupSession.host } : cart,
      items,
      coupon: cart.coupon || null,
      groupSession: isGroupCart ? groupSession : null,
      isGoldMember,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `get cart error: ${error.message}` },
      { status: 500 }
    );
  }
}
