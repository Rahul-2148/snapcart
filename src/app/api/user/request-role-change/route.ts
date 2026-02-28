import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Notification from "@/models/notification.model";
import { sendNotification, emitRoleChangeRequest } from "@/lib/server/socket";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();

    // SECURITY: Only deliveryBoy role can be requested by users
    // Admin role can ONLY be assigned by existing admins
    if (role !== "deliveryBoy") {
      return NextResponse.json(
        { message: "You can only request to become a Delivery Partner" },
        { status: 403 }
      );
    }

    await connectDb();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user already has deliveryBoy role
    if (user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { message: "You are already a Delivery Partner" },
        { status: 400 }
      );
    }

    // Check if request already pending
    if (user.roleChangeRequest === "pending") {
      return NextResponse.json(
        { message: "You already have a pending request" },
        { status: 400 }
      );
    }

    user.roleChangeRequest = "pending";
    user.requestedRole = role;
    user.roleChangeRequestTimestamp = new Date();
    await user.save();
    
    // Notify all admins about the new role change request
    try {
        const admins = await User.find({ roles: "admin" });
        for (const admin of admins) {
            const newNotification = await Notification.create({
                recipient: admin._id,
                type: "role_change",
                message: `User ${user.name} (${user.email}) requested to change role to ${role}`,
                link: `/admin/users?userId=${user._id}`,
                read: false,
                createdAt: new Date(),
            });
            await sendNotification(admin._id.toString(), newNotification);
        }
        
        // Emit to all admins in real-time via socket
        await emitRoleChangeRequest({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            requestedRole: role,
            timestamp: new Date(),
        });
    } catch (notificationError) {
        console.error("❌ Error sending role change request notification to admins:", notificationError);
    }
    
    const res = NextResponse.json(
      { message: "Role change request submitted successfully", user },
      { status: 200 }
    );

    return res
  } catch (error: any) {
    console.error("Error submitting role change request:", error);
    return NextResponse.json(
      { message: `Error submitting request: ${error.message}` },
      { status: 500 }
    );
  }
}
