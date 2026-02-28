import BannerManagement from "@/components/admin/BannerManagement";

export const metadata = {
  title: "Banner Management | Admin Dashboard",
  description: "Manage promotional banners for the homepage",
};

export default function BannersPage() {
  return (
    <div className="p-6">
      <BannerManagement />
    </div>
  );
}
