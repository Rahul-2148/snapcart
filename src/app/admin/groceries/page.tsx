"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "sonner";
import AdvancedPagination from "@/components/common/AdvancedPagination";

// Corrected interface based on the models
interface IGroceryVariant {
  _id: string;
  label: string;
  price: {
    mrp: number;
    selling: number;
  };
  countInStock?: number;
  cod?: {
    status: "not-allowed" | "with-charge" | "free";
  };
}
interface IGrocery {
  _id: string;
  name: string;
  images: {
    url: string;
  }[];
  category: {
    name: string;
  };
  variants: IGroceryVariant[];
}

interface IPolicyStatus {
  _id: string;
  hasPolicy: boolean;
  isReturnable?: boolean;
  returnWindowDays?: number;
  policyType?: string;
}

const GroceriesPage = () => {
  const [groceries, setGroceries] = useState<IGrocery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [policiesByGrocery, setPoliciesByGrocery] = useState<{
    [key: string]: IPolicyStatus;
  }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchPolicies = useCallback(async (groceryIds: string[]) => {
    try {
      const policies: { [key: string]: IPolicyStatus } = {};
      await Promise.all(
        groceryIds.map(async (id) => {
          try {
            const res = await axios.get(
              `/api/returns/policy?groceryId=${id}`
            );
            if (res.data.hasPolicy) {
              policies[id] = {
                _id: id,
                hasPolicy: true,
                isReturnable: res.data.isReturnable,
                returnWindowDays: res.data.returnWindowDays,
                policyType: res.data.policyType,
              };
            } else {
              policies[id] = { _id: id, hasPolicy: false };
            }
          } catch (error) {
            console.error(`Failed to fetch policy for ${id}`, error);
            policies[id] = { _id: id, hasPolicy: false };
          }
        })
      );
      setPoliciesByGrocery(policies);
    } catch (error) {
      console.error("Failed to fetch policies", error);
    }
  }, []);

  const fetchGroceries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/groceries?search=${encodeURIComponent(debouncedSearch)}`
      );
      if (res.data.success) {
        setGroceries(res.data.groceries);
        // Fetch policies for all groceries
        await fetchPolicies(res.data.groceries.map((g: IGrocery) => g._id));
      }
    } catch (error) {
      console.error("Failed to fetch groceries", error);
      toast.error("Failed to fetch groceries");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fetchPolicies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchGroceries();
  }, [debouncedSearch, fetchGroceries]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!loading && wasFocusedRef.current && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        const res = await axios.delete(`/api/admin/groceries/${id}`);
        if (res.data.success) {
          setGroceries(groceries.filter((g) => g._id !== id));
          toast.success("Grocery item deleted successfully");
        } else {
          toast.error(res.data.message || "Failed to delete grocery item");
        }
      } catch (error) {
        console.error("Failed to delete grocery item", error);
        toast.error("Failed to delete grocery item");
      }
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(groceries.length / itemsPerPage);
  const paginatedGroceries = groceries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Groceries</h1>
        <Link
          href="/admin/add-grocery"
          className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Grocery
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search groceries by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              wasFocusedRef.current = true;
            }}
            onBlur={() => {
              wasFocusedRef.current = false;
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center">Loading groceries...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Image
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Stock
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    COD Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Policy Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Return Policy
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedGroceries.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/product-details/${item._id}`}>
                        <div className="relative inline-block">
                          <Image
                            src={item.images[0]?.url || "/placeholder.png"}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="rounded-full cursor-pointer hover:scale-110 transition-transform duration-200"
                            title="Click to view details"
                          />
                          {item.images?.length ? (
                            <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {item.images.length}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="line-through">
                        ₹{Math.round(item.variants[0]?.price.mrp || 0)}
                      </span>{" "}
                      ₹{Math.round(item.variants[0]?.price.selling || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.variants.reduce(
                        (acc, v) => acc + (v.countInStock || 0),
                        0
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.variants.length === 1 && item.variants[0] ? (
                        <>
                          {item.variants[0]?.cod?.status === "not-allowed" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ❌ Not Allowed
                            </span>
                          ) : item.variants[0]?.cod?.status === "free" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Free COD
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              💰 With Charge
                            </span>
                          )}
                        </>
                      ) : (
                        // Multiple variants - show compact view
                        <div className="flex flex-col gap-1">
                          {item.variants.map((v) => (
                            <div key={v._id} className="text-xs">
                              <span className="text-gray-700 font-medium">{v.label}:</span>{" "}
                              {v.cod?.status === "not-allowed" ? (
                                <span className="text-red-600">❌ Not Allowed</span>
                              ) : v.cod?.status === "free" ? (
                                <span className="text-green-600">✓ Free</span>
                              ) : (
                                <span className="text-amber-600">💰 Charged</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/add-grocery/${item._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {policiesByGrocery[item._id]?.hasPolicy &&
                      policiesByGrocery[item._id]?.isReturnable ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ {policiesByGrocery[item._id]?.returnWindowDays} days -{" "}
                          {policiesByGrocery[item._id]?.policyType === "both"
                            ? "Return or Replacement"
                            : policiesByGrocery[item._id]?.policyType ===
                                "return-only"
                              ? "Return"
                              : "Replacement"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⚠ Returns Not Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/groceries/${item._id}/return-policy`}
                        className="inline-flex items-center text-green-600 hover:text-green-900"
                        title="Set return policy for this product"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Advanced Pagination */}
        {!loading && groceries.length > 0 && (
          <div className="p-4">
            <AdvancedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={groceries.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[5, 10, 20, 50, 100]}
              showItemsPerPage={true}
              showJumpToPage={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GroceriesPage;
