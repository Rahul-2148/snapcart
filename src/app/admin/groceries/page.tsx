"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";

import { toast } from "sonner";

// Corrected interface based on the models
interface IGroceryVariant {
  price: {
    mrp: number;
    selling: number;
  };
  countInStock?: number;
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

const GroceriesPage = () => {
  const [groceries, setGroceries] = useState<IGrocery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);

  const fetchGroceries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/groceries?search=${encodeURIComponent(debouncedSearch)}`
      );
      if (res.data.success) {
        setGroceries(res.data.groceries);
      }
    } catch (error) {
      console.error("Failed to fetch groceries", error);
      toast.error("Failed to fetch groceries");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchGroceries();
  }, [debouncedSearch, fetchGroceries]);

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
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groceries.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/product-details/${item._id}`}>
                        <Image
                          src={item.images[0]?.url || "/placeholder.png"}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="rounded-full cursor-pointer hover:scale-110 transition-transform duration-200"
                          title="Click to view details"
                        />
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/add-grocery/${item._id}`}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="inline-flex items-center text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroceriesPage;
