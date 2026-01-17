"use client";
import OrderDetailsModal from "@/components/admin/OrderDetailsModal";
import OrderTable from "@/components/admin/OrderTable";
import {
  CurrencyRupeeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
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

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [totalOrdersPages, setTotalOrdersPages] = useState(1);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, salesRes] = await Promise.all([
        axios.get(`/api/admin/dashboard-stats?page=1&limit=5`),
        axios.get("/api/admin/charts/sales-over-time"),
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
    fetchOrdersData();
  }, [ordersPage, fetchOrdersData]);

  const handleViewOrder = async (order: any) => {
    try {
      const res = await axios.get(`/api/admin/order/${order._id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.order);
        setIsModalOpen(true);
      } else {
        alert("Failed to fetch order details");
      }
    } catch (error) {
      alert("Failed to fetch order details");
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
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
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
          Recent Orders
        </h2>
        <div className="bg-white shadow-lg overflow-hidden rounded-xl border border-gray-100">
          {ordersLoading ? (
            <div className="p-6 text-center">Loading orders...</div>
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
