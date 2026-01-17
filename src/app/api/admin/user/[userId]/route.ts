import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Notification from "@/models/notification.model"; // Import Notification model
import { sendNotification } from "@/lib/server/socket"; // Import sendNotification

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();

    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { userId } = resolvedParams;
    const { role, isBlocked, roleChangeRequest } = await req.json();

    await connectDb();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    const unsetData: any = {};
    let notificationMessage = ""; // Initialize notification message

    if (role && ["user", "deliveryBoy", "admin"].includes(role)) {
      updateData.role = role;
      if (user.role !== role) { // Check if role actually changed
          notificationMessage = `Your role has been updated to ${role} by an admin.`;
      }
    }

    if (typeof isBlocked === "boolean") {
      updateData.isBlocked = isBlocked;
    }

    if (roleChangeRequest) {
      if (roleChangeRequest === "approved" && user.requestedRole) {
        updateData.role = user.requestedRole;
        updateData.roleChangeRequest = "none";
        unsetData.requestedRole = ""; // Using unset
        notificationMessage = `Your request to become a ${user.requestedRole} has been approved.`;
      } else if (roleChangeRequest === "rejected") {
        updateData.roleChangeRequest = "none";
        unsetData.requestedRole = ""; // Using unset
        notificationMessage = `Your request to become a ${user.requestedRole || 'a different role'} has been rejected.`;
      } else if (roleChangeRequest === "pending" || roleChangeRequest === "none") {
        updateData.roleChangeRequest = roleChangeRequest;
      }
    }

    const updatePayload: any = {};
    if (Object.keys(updateData).length > 0) {
      updatePayload.$set = updateData;
    }
    if (Object.keys(unsetData).length > 0) {
      updatePayload.$unset = unsetData;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatePayload,
      { new: true }
    ).select("-password");
    
    // Create and send notification if there's a message
    if (updatedUser && notificationMessage) {
        const newNotification = await Notification.create({
            recipient: userId,
            type: "role_change",
            message: notificationMessage,
            read: false,
            createdAt: new Date(),
        });
        await sendNotification(userId, newNotification);
    }

    
    const res =  NextResponse.json({ user: updatedUser }, { status: 200 });
    

    return res
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: `Error updating user: ${error.message}` },
      { status: 500 }
    );
  }
}
