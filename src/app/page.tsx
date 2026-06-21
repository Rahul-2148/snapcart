// This is a server component - Blinkit-style: Guest-first homepage
import { auth } from "@/auth";
import EditRoleMobile from "@/components/EditRoleMobile";
import UserDashboard from "@/components/UserDashboard";
import Welcome from "@/components/Welcome";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { redirect } from "next/navigation";

const Home = async () => {
  await connectDb();
  const session = await auth();

  // If not logged in, show guest homepage (Blinkit-style)
  if (!session?.user?.id) {
    return (
      <>
        {/* Guest landing: show shopping UI directly */}
        <UserDashboard />
      </>
    );
  }

  // If logged in, fetch user details
  const user = await User.findById(session.user.id);
  
  // If user not in DB but has session, still show shopping UI (guest-like experience)
  if (!user) {
    return (
      <>
        <UserDashboard />
      </>
    );
  }

  // Get current role from user
  const userRole = user.currentRole || user.roles?.[0] || "user";

  // Admin redirect
  if (userRole === "admin") {
    redirect("/admin");
  }

  // Delivery boy redirect
  if (userRole === "deliveryBoy") {
    redirect("/delivery-boy");
  }

  // Store manager redirect
  if (userRole === "storeManager") {
    redirect("/store-manager");
  }

  // Incomplete profile - check if mobile number is missing
  const inComplete = !user.mobileNumber;
  if (inComplete) {
    return <EditRoleMobile />;
  }

  return (
    <>
      <UserDashboard />
    </>
  );
};

export default Home;
