"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { IUser } from "@/models/user.model";
import Image from "next/image";
import useSocket from "@/hooks/useSocket";
import { UserIcon } from "lucide-react";

type User = Omit<IUser, "password">;

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const socket = useSocket(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  );

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/api/admin/users");
        setUsers(response.data.users);
      } catch (error) {
        alert("Failed to fetch users.");
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
      alert("User updated successfully!");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  const filteredUsers = users.filter((user) => {
    if (filter === "pending") {
      return user.roleChangeRequest === "pending";
    }
    return true;
  });

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        User Management
      </h2>

      <div className="mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`mr-2 py-1 px-3 rounded-md ${
            filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-200"
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`py-1 px-3 rounded-md ${
            filter === "pending" ? "bg-indigo-600 text-white" : "bg-gray-200"
          }`}
        >
          Pending Requests
        </button>
      </div>

      <div className="overflow-x-auto">
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
                Role
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
            {filteredUsers.map((user) => (
              <tr key={user._id?.toString()}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {user.image?.url ? (
                          <Image
                            src={user.image.url}
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
                  <div className="text-sm text-gray-900">{user.role}</div>
                  {user.roleChangeRequest === "pending" && (
                    <div className="text-xs text-yellow-600">
                      Wants to be {user.requestedRole}
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
                  <div className="flex items-center space-x-4">
                    {user.roleChangeRequest === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleUpdateUser(user._id!.toString(), {
                              roleChangeRequest: "approved",
                            })
                          }
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateUser(user._id!.toString(), {
                              roleChangeRequest: "rejected",
                            })
                          }
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        handleUpdateUser(user._id!.toString(), {
                          isBlocked: !user.isBlocked,
                        })
                      }
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {user.isBlocked ? "Unblock" : "Block"}
                    </button>

                    {/* Dropdown to change role directly */}
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleUpdateUser(user._id!.toString(), {
                          role: e.target.value,
                        })
                      }
                      className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="deliveryBoy">Delivery Boy</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
