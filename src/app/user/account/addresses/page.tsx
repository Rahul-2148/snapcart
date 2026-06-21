"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { IAddress } from "@/models/address.model";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Briefcase, MapPin, Edit, Trash2, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import AddressPickerModal from "@/components/location/AddressPickerModal";
import Link from "next/link";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<IAddress | null>(null);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get("/api/user/addresses");
      setAddresses(response.data.addresses || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleConfirmPickerAddress = (savedAddress: any) => {
    setAddresses((prev) => {
      const exists = prev.some((a) => a._id === savedAddress._id);
      if (exists) {
        return prev.map((a) => (a._id === savedAddress._id ? savedAddress : a));
      } else {
        return [...prev, savedAddress];
      }
    });
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  const handleEditAddress = (address: IAddress) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home size={18} className="text-blue-500" />;
      case "work":
        return <Briefcase size={18} className="text-green-500" />;
      default:
        return <MapPin size={18} className="text-purple-500" />;
    }
  };

  const getTypeLabel = (type: string, customLabel?: string) => {
    switch (type) {
      case "home":
        return "Home";
      case "work":
        return "Work";
      default:
        return customLabel || "Other";
    }
  };

  const handleDeleteAddress = async (id: any) => {
    const toastId = toast.loading("Deleting address...");
    try {
      await axios.delete(`/api/user/addresses/${id}`);
      setAddresses((prev) => prev.filter((address) => address._id !== id));
      toast.dismiss(toastId);
      toast.success("Address deleted successfully");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to delete address");
      console.error("Error deleting address:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-0 pb-6 relative">
      {/* Back button */}
      <Link
        href="/user/account"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft size={14} />
        Back to account
      </Link>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            My Saved Addresses
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your delivery coordinates and completed details
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAddress(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-green-600/10 cursor-pointer"
        >
          <Plus size={16} />
          Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50/20 max-w-lg mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
            <MapPin size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-700">No Addresses Saved</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
            You don't have any saved locations yet. Add an address using the map picker to get started!
          </p>
          <button
            onClick={() => {
              setEditingAddress(null);
              setIsModalOpen(true);
            }}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-green-600/10"
          >
            <Plus size={14} /> Add Address
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address: any) => (
            <div
              key={address._id}
              className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 text-left flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 text-[10px] font-bold capitalize flex items-center gap-1.5 border border-slate-100">
                    {getTypeIcon(address.type)}
                    {getTypeLabel(address.type, address.customLabel)}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="p-1.5 rounded-lg hover:bg-slate-150 text-slate-400 hover:text-slate-700 transition"
                      title="Edit Address"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                      title="Delete Address"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {address.fullName && (
                    <div className="text-xs font-bold text-slate-700">
                      Receiver: {address.fullName}{address.mobile ? ` (${address.mobile})` : ""}
                      {address.alternateMobile && (
                        <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                          Alt: {address.alternateMobile}
                        </span>
                      )}
                    </div>
                  )}
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">
                    {address.street}
                  </h4>
                  {address.label && (
                    <p className="text-xs text-green-600 font-semibold">
                      📍 Landmark: {address.label}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 leading-normal line-clamp-2">
                    {address.fullAddress}
                  </p>
                </div>
              </div>
              
              {/* Show coordinates details for clarity */}
              {address.latitude && address.longitude && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>📍 Coordinates set</span>
                  <span>{address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modern map picker modal */}
      <AddressPickerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAddress(null);
        }}
        onConfirm={handleConfirmPickerAddress}
        editingAddressData={editingAddress}
      />
    </div>
  );
}
