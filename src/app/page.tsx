// This is a server component
import { auth } from "@/auth";
import DeliveryBoyDashboard from "@/components/DeliveryBoyDashboard";
import EditRoleMobile from "@/components/EditRoleMobile";
import Navbar from "@/components/Navbar";
import UserDashboard from "@/components/UserDashboard";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { redirect } from "next/navigation";

const Home = async () => {
  await connectDb();
  const session = await auth();
  const user = await User.findById(session?.user?.id);
  if (!user) {
    console.log("User not found in DB, redirecting to login");
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  const inComplete =
    !user.mobileNumber ||
    !user.role ||
    (!user.mobileNumber && user.role === "user");
  if (inComplete) {
    return <EditRoleMobile />;
  }
  const plainUser = JSON.parse(JSON.stringify(user));
  return (
    <>
      <Navbar user={plainUser} />
      {user.role === "user" ? <UserDashboard /> : <DeliveryBoyDashboard />}
    </>
  );
};

export default Home;
