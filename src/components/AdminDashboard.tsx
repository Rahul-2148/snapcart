import Link from "next/link";
import OrderDetailsModal from "@/components/admin/OrderDetailsModal";
import OrderTable from "@/components/admin/OrderTable";
import Loader from "@/components/common/Loader";
import { useSocket } from "@/contexts/SocketContext";
import axios from "axios";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { motion } from "framer-motion";
import {
  CurrencyRupeeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: any[];
}

interface SalesData {
  date: string;
  sales: number;
}

interface OrderStatusData {
  name: string;
  value: number;
  [key: string]: any;
}

interface GenderData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const AdminDashboard = () => {
  // @ts-ignore
  const { userData } = useSelector((state: RootState) => state.user);
  const socket = useSocket();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [genderByRole, setGenderByRole] = useState<{
    userData: GenderData[];
    deliveryBoyData: GenderData[];
    adminData: GenderData[];
  }>({ userData: [], deliveryBoyData: [], adminData: [] });
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGenderTab, setSelectedGenderTab] = useState<"overall" | "user" | "delivery" | "admin">("overall");
  const [ordersPage, setOrdersPage] = useState(1);
  const [totalOrdersPages, setTotalOrdersPages] = useState(1);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, salesRes, genderRes, genderRoleRes] = await Promise.all([
        axios.get(`/api/admin/dashboard-stats?page=1&limit=5`),
        axios.get("/api/admin/charts/sales-over-time"),
        axios.get("/api/admin/charts/gender-distribution"),
        axios.get("/api/admin/charts/gender-by-role"),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
        setTotalOrdersPages(statsRes.data.totalPages);
        // Process order status data for pie chart
        if (statsRes.data.recentOrders) {
          const statusCount: { [key: string]: number } = {};
          statsRes.data.recentOrders.forEach((order: any) => {
            statusCount[order.orderStatus] =
              (statusCount[order.orderStatus] || 0) + 1;
          });
          const pieData = Object.entries(statusCount).map(([name, value]) => ({
            name,
            value: value as number,
          }));
          setOrderStatusData(pieData);
        }
      }
      if (salesRes.data.success) {
        setSalesData(salesRes.data.salesData);
      }
      if (genderRes.data.success) {
        setGenderData(genderRes.data.genderData);
      }
      if (genderRoleRes.data.success) {
        setGenderByRole({
          userData: genderRoleRes.data.userData,
          deliveryBoyData: genderRoleRes.data.deliveryBoyData,
          adminData: genderRoleRes.data.adminData,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrdersData = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await axios.get(
        `/api/admin/dashboard-stats?page=${ordersPage}&limit=5`
      );
      if (res.data) {
        setStats((prev) =>
          prev ? { ...prev, recentOrders: res.data.recentOrders } : prev
        );
        setTotalOrdersPages(res.data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching orders data:", error);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (socket && userData?.roles?.includes("admin")) {
      socket.on("new_role_request", (data: any) => {
        toast.info(`${data.userName} requested to become ${data.requestedRole}`);
        // Refresh the dashboard data
        fetchInitialData();
      });
    }
    return () => {
      if (socket) socket.off("new_role_request");
    };
  }, [socket, userData?.roles, fetchInitialData]);

  useEffect(() => {
    fetchOrdersData();
  }, [ordersPage, fetchOrdersData]);

  const handleViewOrder = async (order: any) => {
    try {
      const res = await axios.get(`/api/admin/order/${order._id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.order);
        setIsModalOpen(true);
      } else {
        toast.error("Failed to fetch order details");
      }
    } catch (error) {
      toast.error("Failed to fetch order details");
    }
  };

  if (loading) {
    return <Loader fullscreen size="large" text="Loading Dashboard..." />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div>
      {/* Welcome Card */}
      <div className="mb-6 md:mb-8">
        <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8">
            {/* Left Content */}
            <div className="flex-1 text-white mb-4 md:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="h-6 w-6" />
                <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Welcome Back</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {getGreeting()}, {userData?.name?.split(" ")[0]}! 
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 20, -20, 20, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                  }}
                  className="inline-block ml-2 origin-[70%_70%]"
                >
                  👋
                </motion.span>
              </h1>
              <p className="text-green-100 text-sm md:text-base max-w-2xl">
                Welcome to SnapCart Grocery Admin Dashboard. Manage your store, monitor orders, and grow your business with ease.
              </p>
            </div>
            
            {/* Right Image */}
            <div className="flex-shrink-0 relative w-32 h-32 md:w-40 md:h-40">
              <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm"></div>
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="text-6xl md:text-7xl">🛒</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />
            <div className="ml-3 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-blue-100">
                Total Users
              </p>
              <p className="text-xl md:text-2xl font-bold text-white">
                {stats?.totalUsers}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <ShoppingCartIcon className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />
            <div className="ml-3 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-green-100">
                Total Orders
              </p>
              <p className="text-xl md:text-2xl font-bold text-white">
                {stats?.totalOrders}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <CurrencyRupeeIcon className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />
            <div className="ml-3 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-purple-100">
                Total Revenue
              </p>
              <p className="text-lg md:text-2xl font-bold text-white">
                ₹{stats?.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Management Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        <Link
          href="/admin/users"
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-300 border border-blue-200 hover:scale-105"
        >
          <div className="text-3xl mb-2">👥</div>
          <h3 className="font-bold text-gray-800">Manage Users</h3>
          <p className="text-xs text-gray-600 mt-1">View & block users</p>
        </Link>

        <Link
          href="/admin/delivery-partners"
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-300 border border-orange-200 hover:scale-105"
        >
          <div className="text-3xl mb-2">🚚</div>
          <h3 className="font-bold text-gray-800">Delivery Partners</h3>
          <p className="text-xs text-gray-600 mt-1">Manage delivery fleet</p>
        </Link>

        <Link
          href="/admin/orders"
          className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-300 border border-green-200 hover:scale-105"
        >
          <div className="text-3xl mb-2">📦</div>
          <h3 className="font-bold text-gray-800">Orders</h3>
          <p className="text-xs text-gray-600 mt-1">Track all orders</p>
        </Link>

        <Link
          href="/admin/coupons"
          className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-300 border border-purple-200 hover:scale-105"
        >
          <div className="text-3xl mb-2">🎟️</div>
          <h3 className="font-bold text-gray-800">Coupons</h3>
          <p className="text-xs text-gray-600 mt-1">Create promotions</p>
        </Link>
      </div>

      {/* Charts */}
      <div className="space-y-6 mb-6 md:mb-8">
        {/* Sales Chart */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
            Sales (Last 30 Days)
          </h2>
          <ResponsiveContainer
            width="100%"
            height={250}
            className="md:h-[300px]"
          >
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ fill: "#6B7280" }}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                tick={{ fill: "#6B7280" }}
              />
              <Tooltip
                formatter={(value) => [`₹${value}`, "Sales"]}
                contentStyle={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
            Order Status Distribution
          </h2>
          <ResponsiveContainer
            width="100%"
            height={250}
            className="md:h-[300px]"
          >
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  percent ? `${name} ${(percent * 100).toFixed(0)}%` : name
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Professional Gender Demographics Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 col-span-full">
          <div className="flex flex-col gap-6">
            {/* Header with Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Gender Demographics
              </h2>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "overall", label: "Overall" },
                  { id: "user", label: "Users" },
                  { id: "delivery", label: "Delivery Partners" },
                  { id: "admin", label: "Admins" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedGenderTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedGenderTab === tab.id
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pie Chart */}
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(
                        selectedGenderTab === "overall"
                          ? genderData
                          : selectedGenderTab === "user"
                          ? genderByRole.userData
                          : selectedGenderTab === "delivery"
                          ? genderByRole.deliveryBoyData
                          : genderByRole.adminData
                      ) as any}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(
                        selectedGenderTab === "overall"
                          ? genderData
                          : selectedGenderTab === "user"
                          ? genderByRole.userData
                          : selectedGenderTab === "delivery"
                          ? genderByRole.deliveryBoyData
                          : genderByRole.adminData
                      ).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#F9FAFB",
                        border: "1px solid #D1D5DB",
                        borderRadius: "8px",
                        padding: "10px",
                      }}
                      formatter={(value, name, props) => [
                        value,
                        `Count: ${value}`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Stats Card */}
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Distribution
                </h3>
                <div className="space-y-3">
                  {(
                    selectedGenderTab === "overall"
                      ? genderData
                      : selectedGenderTab === "user"
                      ? genderByRole.userData
                      : selectedGenderTab === "delivery"
                      ? genderByRole.deliveryBoyData
                      : genderByRole.adminData
                  ).map((item, index) => {
                    const total =
                      selectedGenderTab === "overall"
                        ? genderData.reduce((sum, d) => sum + d.value, 0)
                        : selectedGenderTab === "user"
                        ? genderByRole.userData.reduce((sum, d) => sum + d.value, 0)
                        : selectedGenderTab === "delivery"
                        ? genderByRole.deliveryBoyData.reduce(
                            (sum, d) => sum + d.value,
                            0
                          )
                        : genderByRole.adminData.reduce((sum, d) => sum + d.value, 0);
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gray-800">
                            {item.value}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full transition-all duration-300 rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
          Recent Orders
        </h2>
        <div className="bg-white shadow-lg overflow-hidden rounded-xl border border-gray-100">
          {ordersLoading ? (
            <Loader size="medium" text="Loading Orders..." />
          ) : (
            <OrderTable
              orders={stats?.recentOrders || []}
              onViewOrder={handleViewOrder}
              variant="dashboard"
            />
          )}
          {/* Pagination */}
          {totalOrdersPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <button
                onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                disabled={ordersPage === 1 || ordersLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {ordersPage} of {totalOrdersPages}
              </span>
              <button
                onClick={() =>
                  setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))
                }
                disabled={ordersPage === totalOrdersPages || ordersLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      {isModalOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setIsModalOpen(false)}
          onUpdate={() => {
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
