"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { IUser } from "@/models/user.model";
import Image from "next/image";
import { useSocket } from "@/contexts/SocketContext";
import { UserIcon } from "lucide-react";
import AdvancedPagination from "@/components/common/AdvancedPagination";

type User = Omit<IUser, "password">;

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "pending_kyc">("all");
  const [openRoleMenuUserId, setOpenRoleMenuUserId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const socket = useSocket();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/api/admin/users");
        setUsers(response.data.users);
      } catch (error) {
        toast.error("Failed to fetch users.");
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("new_role_request", (user: User) => {
        setUsers((prevUsers) => {
          const existingUserIndex = prevUsers.findIndex(
            (u) => u._id === user._id
          );
          if (existingUserIndex !== -1) {
            const updatedUsers = [...prevUsers];
            updatedUsers[existingUserIndex] = user;
            return updatedUsers;
          } else {
            return [...prevUsers, user];
          }
        });
      });
    }
  }, [socket]);

  const handleUpdateUser = async (
    userId: string,
    update: {
      role?: string;
      removeRole?: string;
      isBlocked?: boolean;
      roleChangeRequest?: "approved" | "rejected";
    }
  ) => {
    try {
      const response = await axios.patch(`/api/admin/user/${userId}`, update);
      setUsers(
        users.map((u) =>
          u._id?.toString() === userId ? response.data.user : u
        )
      );
      if (
        socket &&
        (update.roleChangeRequest === "approved" ||
          update.roleChangeRequest === "rejected")
      ) {
        socket.emit("role_request_status_update", {
          userId,
          status: update.roleChangeRequest,
          user: response.data.user,
        });
      }
      toast.success("User updated successfully!");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user.");
    }
  };

  const filteredUsers = users.filter((user) => {
    if (filter === "pending") {
      return user.roleChangeRequest === "pending";
    }
    if (filter === "pending_kyc") {
      return user.kyc?.status === "pending";
    }
    return true;
  });

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        User Management
      </h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`py-1.5 px-3 rounded-md text-xs font-semibold ${
            filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`py-1.5 px-3 rounded-md text-xs font-semibold ${
            filter === "pending" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Pending Requests
        </button>
        <button
          onClick={() => setFilter("pending_kyc")}
          className={`py-1.5 px-3 rounded-md text-xs font-semibold ${
            filter === "pending_kyc" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Pending KYC Approval
        </button>
      </div>

      <div className="overflow-x-auto relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Mobile Number
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Gender
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Role & KYC
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.map((user) => (
              <tr key={user._id?.toString()}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {user.image && (typeof user.image === "string" || user.image.url) ? (
                          <img
                            src={typeof user.image === "string" ? user.image : user.image.url}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">
                    {user.mobileNumber || <span className="text-gray-400 italic">Not provided</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700 capitalize">
                    {user.gender ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {user.gender === "prefer-not-to-say" ? "N/A" : user.gender}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {/* Show all roles for multi-role support */}
                    {user.roles && user.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role: string) => (
                          <div key={role} className="flex items-center gap-1">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${user.currentRole === role ? 'bg-green-200 text-green-900 font-bold' : 'bg-blue-100 text-blue-800'}`}>
                              {role === "deliveryBoy" ? "Delivery Partner" : role.charAt(0).toUpperCase() + role.slice(1)}
                              {user.currentRole === role && <span className="ml-1">(Current)</span>}
                            </span>
                            {(user.roles?.length || 0) > 1 && (
                              <button
                                className="text-xs px-1 py-0.5 bg-red-200 text-red-900 rounded hover:bg-red-300 ml-1"
                                onClick={() => handleUpdateUser(user._id!.toString(), { removeRole: role })}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "No roles"
                    )}
                  </div>
                  {user.roleChangeRequest === "pending" && (
                    <div className="text-xs text-yellow-600 mt-1">
                      📝 Requested: {user.requestedRole}
                    </div>
                  )}
                  {user.kyc && user.kyc.status !== "not_submitted" && (
                    <div className="mt-2 text-xs">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full capitalize text-[10px] font-bold ${
                        user.kyc.status === "approved" ? "bg-green-100 text-green-800 border border-green-200" :
                        user.kyc.status === "rejected" ? "bg-red-100 text-red-800 border border-red-200" :
                        "bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse"
                      }`}>
                        KYC status: {user.kyc.status}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isBlocked ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Blocked
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      {/* Approve/Reject role change requests */}
                      {user.roleChangeRequest === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateUser(user._id!.toString(), {
                                roleChangeRequest: "approved",
                              })
                            }
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateUser(user._id!.toString(), {
                                roleChangeRequest: "rejected",
                              })
                            }
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                    {/* Add/Remove roles - Admin can add roles - Only show if roles can be added */}
                    {(user.roles?.length || 0) < 2 && (
                      <div className="relative">
                        <button
                          ref={(el) => {
                            if (user._id) buttonRefs.current[user._id.toString()] = el;
                          }}
                          onClick={() => {
                            const userId = user._id?.toString();
                            if (!userId) return;
                            
                            if (openRoleMenuUserId === userId) {
                              setOpenRoleMenuUserId(null);
                              setMenuPosition(null);
                            } else {
                              const button = buttonRefs.current[userId];
                              if (button) {
                                const rect = button.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + window.scrollY + 4,
                                  right: window.innerWidth - rect.right + window.scrollX
                                });
                              }
                              setOpenRoleMenuUserId(userId);
                            }
                          }}
                          className="text-xs px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                        >
                          + Add Role
                        </button>
                      </div>
                    )}

                    {/* Block/Unblock */}
                    <button
                      onClick={() =>
                        handleUpdateUser(user._id!.toString(), {
                          isBlocked: !user.isBlocked,
                        })
                      }
                      className={`text-xs px-2 py-1 rounded ${
                        user.isBlocked
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                    >
                      {user.isBlocked ? "🔓 Unblock" : "🔒 Block"}
                    </button>
                  </div>

                  {/* KYC Pending Document Review */}
                  {user.kyc?.status === "pending" && (
                    <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-left max-w-xs animate-in slide-in-from-top-1 duration-200">
                      <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                        <p>🪪 Aadhaar: <span className="text-slate-800 font-bold">{user.kyc.aadhaarNumber || "N/A"}</span></p>
                        <p>📄 PAN: <span className="text-slate-800 font-bold">{user.kyc.panNumber || "N/A"}</span></p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {user.kyc.documents?.map((doc: any, idx: number) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-indigo-600 bg-white border border-indigo-200/50 px-2 py-0.5 rounded font-bold hover:bg-indigo-50"
                          >
                            {doc.type.replace("_", " ").toUpperCase()}
                          </a>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={async () => {
                            try {
                              const res = await axios.patch(`/api/admin/user/${user._id}/kyc`, { action: "approve" });
                              if (res.data.success) {
                                toast.success("User KYC Approved successfully!");
                                // Refresh User List
                                const response = await axios.get("/api/admin/users");
                                setUsers(response.data.users);
                              }
                            } catch {
                              toast.error("Failed to approve KYC.");
                            }
                          }}
                          className="text-[10px] font-bold px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer transition"
                        >
                          Approve KYC
                        </button>
                        <button
                          onClick={async () => {
                            const reason = prompt("Enter KYC rejection reason:");
                            if (reason === null) return; // user cancelled
                            if (!reason.trim()) {
                              toast.error("Rejection reason is required.");
                              return;
                            }
                            try {
                              const res = await axios.patch(`/api/admin/user/${user._id}/kyc`, { action: "reject", rejectionReason: reason });
                              if (res.data.success) {
                                toast.success("User KYC Rejected");
                                // Refresh User List
                                const response = await axios.get("/api/admin/users");
                                setUsers(response.data.users);
                              }
                            } catch {
                              toast.error("Failed to reject KYC.");
                            }
                          }}
                          className="text-[10px] font-bold px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer transition"
                        >
                          Reject KYC
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fixed Position Dropdown Menu */}
      {openRoleMenuUserId && menuPosition && (
        <>
          {/* Backdrop to close menu on outside click */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setOpenRoleMenuUserId(null);
              setMenuPosition(null);
            }}
          />
          {/* Dropdown Menu */}
          <div 
            className="fixed bg-white border border-gray-200 rounded shadow-xl z-50 min-w-[180px]"
            style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
          >
            {["user", "deliveryBoy", "storeManager"].map((role: string) => {
              const user = users.find(u => u._id?.toString() === openRoleMenuUserId);
              if (user?.roles?.includes(role as any)) return null;
              return (
                <button
                  key={role}
                  onClick={() => {
                    handleUpdateUser(openRoleMenuUserId, {
                      role: role,
                    });
                    setOpenRoleMenuUserId(null);
                    setMenuPosition(null);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-700 whitespace-nowrap"
                >
                  Add {role === "deliveryBoy" ? "Delivery Partner" : role === "storeManager" ? "Store Manager" : role}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="mt-6">
          <AdvancedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[5, 10, 20, 50]}
            showItemsPerPage={true}
            showJumpToPage={true}
          />
        </div>
      )}
    </div>
  );
}
