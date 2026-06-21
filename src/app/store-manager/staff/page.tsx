// src/app/store-manager/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone,
  UserCheck,
  UserMinus,
  Users,
  Briefcase,
  X,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  LogOut
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface IStaff {
  _id: string;
  name: string;
  role: "picker" | "loader" | "unloader" | "cleaner";
  gender: "male" | "female" | "other";
  phone: string;
  status: "on-duty" | "off-duty" | "leave";
  salary: number;
  powers: string[];
  createdAt: string;
}

export default function StoreStaffRegistry() {
  const [staff, setStaff] = useState<IStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<IStaff | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [role, setRole] = useState<"picker" | "loader" | "unloader" | "cleaner">("picker");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"on-duty" | "off-duty" | "leave">("on-duty");

  // Filtering
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/store-manager/staff");
      setStaff(res.data.staff || []);
    } catch (error: any) {
      console.error("Failed to load staff list", error);
      toast.error(error.response?.data?.error || "Failed to load staff members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setName("");
    setRole("picker");
    setGender("male");
    setPhone("");
    setStatus("on-duty");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: IStaff) => {
    setEditingStaff(member);
    setName(member.name);
    setRole(member.role);
    setGender(member.gender);
    setPhone(member.phone);
    setStatus(member.status);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const dataPayload = { name, role, gender, phone, status };

    try {
      if (editingStaff) {
        await axios.put(`/api/store-manager/staff?id=${editingStaff._id}`, dataPayload);
        toast.success("Staff member details updated successfully!");
      } else {
        await axios.post("/api/store-manager/staff", dataPayload);
        toast.success("Staff member registered successfully!");
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member from this dark store?")) return;

    try {
      await axios.delete(`/api/store-manager/staff?id=${id}`);
      toast.success("Staff member removed successfully");
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to remove staff member");
    }
  };

  // Filtered staff list
  const filteredStaff = staff.filter((member) => {
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesRole && matchesStatus;
  });

  // Calculate statistics counts
  const totalCount = staff.length;
  const onDutyCount = staff.filter((s) => s.status === "on-duty").length;
  const offDutyCount = staff.filter((s) => s.status === "off-duty").length;
  const leaveCount = staff.filter((s) => s.status === "leave").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            Store Staff Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Register and coordinate shifts for pickers, loaders, unloaders, and cleaners in your dark store.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-3 rounded-xl shadow-lg hover:shadow-green-100 transition-all cursor-pointer text-sm"
        >
          <Plus className="w-4.5 h-4.5" />
          Register Staff
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total Staff</p>
            <h4 className="text-lg font-extrabold text-slate-800">{totalCount}</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">On Duty</p>
            <h4 className="text-lg font-extrabold text-slate-800">{onDutyCount}</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Off Duty</p>
            <h4 className="text-lg font-extrabold text-slate-800">{offDutyCount}</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">On Leave</p>
            <h4 className="text-lg font-extrabold text-slate-800">{leaveCount}</h4>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Quick Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Role Filter */}
          <div className="flex-1 sm:flex-none">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:border-green-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="picker">Picker</option>
              <option value="loader">Loader</option>
              <option value="unloader">Unloader</option>
              <option value="cleaner">Cleaner</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:border-green-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="on-duty">On Duty</option>
              <option value="off-duty">Off Duty</option>
              <option value="leave">On Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Grid Listing */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading staff records...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Staff Registered</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            {roleFilter !== "all" || statusFilter !== "all" 
              ? "No staff members match the selected role/status criteria." 
              : "Get started by registering shift pickers, loaders, or maintenance cleaners."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <div
              key={member._id}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5">
                {/* Header info */}
                <div className="flex items-start justify-between mb-3.5">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 truncate">
                      {member.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 capitalize font-medium">
                      Gender: {member.gender}
                    </span>
                  </div>
                  
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                      member.status === "on-duty"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : member.status === "leave"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {member.status === "on-duty" && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                    {member.status === "leave" && <Clock className="w-3 h-3 text-red-500" />}
                    {member.status === "off-duty" && <Clock className="w-3 h-3 text-slate-400" />}
                    <span className="capitalize">{member.status.replace("-", " ")}</span>
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-50 pt-3.5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 capitalize">
                      {member.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${member.phone}`} className="hover:text-green-700 underline font-medium">
                      {member.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salary Bracket:</span>
                    <strong className="text-slate-800 font-bold ml-auto">₹{member.salary?.toLocaleString("en-IN") || 0}/mo</strong>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Powers:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.powers && member.powers.length > 0 ? (
                        member.powers.map((p) => (
                          <span
                            key={p}
                            className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded"
                          >
                            🛡️ {p.replace("_", " ")}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No permissions assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEditModal(member)}
                  className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                  title="Edit Staff"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteStaff(member._id)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer"
                  title="Remove Staff"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingStaff ? "Update Staff Member" : "Register Store Worker"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Worker Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-green-500 outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-green-500 outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Staff Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-green-500 outline-none cursor-pointer"
                >
                  <option value="picker">Picker (picks products)</option>
                  <option value="loader">Loader (incoming shipments)</option>
                  <option value="unloader">Unloader (rider loadings)</option>
                  <option value="cleaner">Cleaner / Maintenance</option>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Gender *
                </label>
                <div className="flex gap-4">
                  {["male", "female", "other"].map((g) => (
                    <label key={g} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer capitalize">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={gender === g}
                        onChange={() => setGender(g as any)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Shift Shift Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-green-500 outline-none cursor-pointer"
                >
                  <option value="on-duty">On Duty (Active Shift)</option>
                  <option value="off-duty">Off Duty</option>
                  <option value="leave">On Leave</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingStaff ? "Save Details" : "Register Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
