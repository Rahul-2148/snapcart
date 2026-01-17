import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Notification from "@/models/notification.model"; // Import Notification model
import { sendNotification } from "@/lib/server/socket"; // Import sendNotification

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();

    if (!role || !["user", "deliveryBoy", "admin"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      );
    }

    await connectDb();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.role === role) {
      return NextResponse.json(
        { message: "You already have this role" },
        { status: 400 }
      );
    }


    user.roleChangeRequest = "pending";
    user.requestedRole = role;
    user.roleChangeRequestTimestamp = new Date();
    await user.save();
    
    // Notify all admins about the new role change request
    try {
        const admins = await User.find({ role: "admin" });
        for (const admin of admins) {
            const newNotification = await Notification.create({
                recipient: admin._id,
                type: "role_change",
                message: `User ${user.name} (${user.email}) requested to change role to ${role}.`,
                link: `/admin/users?userId=${user._id}`, // Optional: Link to the user's admin page
                read: false,
                createdAt: new Date(),
            });
            await sendNotification(admin._id, newNotification);
        }
    } catch (notificationError) {
        console.error("Error sending role change request notification to admins:", notificationError);
        // Do not block role change request if notification fails
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
