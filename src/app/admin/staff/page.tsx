// src/app/admin/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  X,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldAlert,
  Building,
  UserCheck,
  UserMinus,
  Search,
  Settings
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface IStore {
  _id: string;
  name: string;
}

interface IStaff {
  _id: string;
  name: string;
  role: "picker" | "loader" | "unloader" | "cleaner";
  gender: "male" | "female" | "other";
  phone: string;
  status: "on-duty" | "off-duty" | "leave";
  salary: number;
  powers: string[];
  store?: {
    _id: string;
    name: string;
  } | null;
  createdAt: string;
}

const AVAILABLE_POWERS = [
  { id: "pack_orders", label: "Pack Orders", desc: "Can confirm and pack local order shipments" },
  { id: "manage_inventory", label: "Manage Inventory", desc: "Adjust stock availability and count levels" },
  { id: "load_shipments", label: "Load Shipments", desc: "Handle loader/unloader cargo dispatches" },
  { id: "clean_store", label: "Clean Store", desc: "Verify outlet cleanup checklist updates" },
];

export default function AdminStaffDashboard() {
  const [staff, setStaff] = useState<IStaff[]>([]);
  const [stores, setStores] = useState<IStore[]>([]);
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
  const [storeId, setStoreId] = useState("");
  const [salary, setSalary] = useState<number>(0);
  const [powers, setPowers] = useState<string[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, storesRes] = await Promise.all([
        axios.get("/api/admin/staff"),
        axios.get("/api/admin/stores")
      ]);
      setStaff(staffRes.data.staff || []);
      setStores(storesRes.data.stores || []);
    } catch (error: any) {
      console.error("Failed to load admin staff registry data", error);
      toast.error("Failed to load staff or store directory info");
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
    setStoreId(stores[0]?._id || "");
    setSalary(15000);
    setPowers([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: IStaff) => {
    setEditingStaff(member);
    setName(member.name);
    setRole(member.role);
    setGender(member.gender);
    setPhone(member.phone);
    setStatus(member.status);
    setStoreId(member.store?._id || "");
    setSalary(member.salary || 0);
    setPowers(member.powers || []);
    setIsModalOpen(true);
  };

  const handlePowerToggle = (powerId: string) => {
    setPowers((prev) =>
      prev.includes(powerId)
        ? prev.filter((p) => p !== powerId)
        : [...prev, powerId]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !storeId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const dataPayload = {
      name,
      role,
      gender,
      phone,
      status,
      storeId,
      salary: Number(salary),
      powers
    };

    try {
      if (editingStaff) {
        await axios.put(`/api/admin/staff?id=${editingStaff._id}`, dataPayload);
        toast.success(`Staff member "${name}" updated successfully!`);
      } else {
        await axios.post("/api/admin/staff", dataPayload);
        toast.success(`Staff member "${name}" registered successfully!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit worker information");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (member: IStaff) => {
    if (!confirm(`Are you sure you want to remove "${member.name}" from the operations team?`)) return;

    try {
      await axios.delete(`/api/admin/staff?id=${member._id}`);
      toast.success("Staff member removed successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to remove staff member");
    }
  };

  // Filtered list
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.phone.includes(searchQuery);
    const matchesStore = storeFilter === "all" || member.store?._id === storeFilter;
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesStore && matchesRole && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Operations Staff Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global dashboard to audit dark store shift workers, assign salary brackets, and authorize access powers.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg hover:shadow-blue-100 transition cursor-pointer text-sm"
        >
          <Plus className="w-4.5 h-4.5" />
          Onboard New Staff
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Headcount</p>
            <h4 className="text-xl font-black text-slate-800 mt-0.5">{staff.length}</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <UserCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active On Duty</p>
            <h4 className="text-xl font-black text-green-700 mt-0.5">{staff.filter(s => s.status === "on-duty").length}</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Building className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dark Outlets</p>
            <h4 className="text-xl font-black text-indigo-700 mt-0.5">{stores.length}</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Payouts</p>
            <h4 className="text-xl font-black text-amber-700 mt-0.5">
              ₹{staff.reduce((acc, curr) => acc + (curr.salary || 0), 0).toLocaleString("en-IN")}
            </h4>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker name or phone number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition"
          />
        </div>

        {/* Filters Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Store Filter */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="flex-1 md:flex-none px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold focus:border-blue-500 focus:bg-white outline-none cursor-pointer"
          >
            <option value="all">All Dark Stores</option>
            {stores.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 md:flex-none px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold focus:border-blue-500 focus:bg-white outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="picker">Picker</option>
            <option value="loader">Loader</option>
            <option value="unloader">Unloader</option>
            <option value="cleaner">Cleaner</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold focus:border-blue-500 focus:bg-white outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="on-duty">On Duty</option>
            <option value="off-duty">Off Duty</option>
            <option value="leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Staff grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200/50 rounded-2xl">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3.5" />
          <p className="text-slate-500 text-sm">Loading staff members directory...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white border border-slate-200/50 rounded-2xl p-16 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No staff members found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new worker for operations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <div
              key={member._id}
              className="bg-white border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5.5 space-y-4">
                {/* Header context */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-50 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 tracking-tight">{member.name}</h4>
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

                {/* Details grid list */}
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2 col-span-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700">
                      {member.store?.name || "Unassigned Dark Store"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 capitalize">{member.role}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${member.phone}`} className="hover:text-blue-700 underline font-medium">
                      {member.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <DollarSign className="w-4.5 h-4.5 text-green-600" />
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase leading-none">Salary Bracket</span>
                      <strong className="text-slate-800 font-bold text-sm">
                        ₹{member.salary?.toLocaleString("en-IN") || 0} / month
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Authorized powers list */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Authorized Powers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.powers && member.powers.length > 0 ? (
                      member.powers.map((p) => {
                        const pName = AVAILABLE_POWERS.find(x => x.id === p)?.label || p;
                        return (
                          <span
                            key={p}
                            className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100 shadow-sm"
                          >
                            🛡️ {pName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No operational powers authorized</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="bg-slate-50/70 px-5.5 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEditModal(member)}
                  className="p-1.5 hover:bg-slate-200/80 text-slate-600 rounded-lg transition cursor-pointer"
                  title="Edit Employee Settings"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteStaff(member)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer"
                  title="Remove Employee"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboard / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                {editingStaff ? "Configure Employee Profile" : "Register Store Worker"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Worker Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Anand Kumar"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                  />
                </div>

                {/* Store assignment dropdown */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Assign Dark Store Branch *
                  </label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select assigned branch...</option>
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Mobile Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Monthly Salary Bracket (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    placeholder="e.g. 18000"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Staff Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="picker">Picker (Packer)</option>
                    <option value="loader">Loader</option>
                    <option value="unloader">Unloader</option>
                    <option value="cleaner">Cleaner / Janitorial</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Active Shift Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="on-duty">On Duty (Active Shift)</option>
                    <option value="off-duty">Off Duty</option>
                    <option value="leave">On Approved Leave</option>
                  </select>
                </div>

                {/* Gender */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Gender Group
                  </label>
                  <div className="flex gap-5 mt-1">
                    {["male", "female", "other"].map((g) => (
                      <label key={g} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer capitalize">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={gender === g}
                          onChange={() => setGender(g as any)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Powers checklists */}
              <div className="border-t border-slate-100 pt-4.5">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3.5 tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-orange-600" />
                  Authorize Operational Powers (Permissions)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                  {AVAILABLE_POWERS.map((power) => (
                    <label
                      key={power.id}
                      className="flex items-start gap-2.5 p-1 rounded-lg hover:bg-slate-100/50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={powers.includes(power.id)}
                        onChange={() => handlePowerToggle(power.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block leading-tight">{power.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-none">{power.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-100 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingStaff ? "Apply Permissions" : "Register Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
