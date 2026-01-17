"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "sonner";
import EditCategoryModal from "@/components/admin/EditCategoryModal";

interface Category {
  _id: string;
  name: string;
  allowedUnits: string[];
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryUnits, setNewCategoryUnits] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const categoryOptions = [
    "Fruits & Vegetables",
    "Dairy & Eggs",
    "Rice, Atta & Grains",
    "Oil & Ghee",
    "Snacks & Biscuits",
    "Beverages & Drinks",
    "Breakfast & Cereals",
    "Spices & Condiments",
    "Dry Fruits & Nuts",
    "Instant & Packaged Foods",
    "Bakery & Breads",
    "Sweets & Chocolates",
    "Frozen Foods",
    "Meat & Seafood",
    "Baby & Pet Care",
    "Personal Care",
    "Cleaning & Laundry",
    "Household Essentials",
    "Pooja Needs",
    "Pharmacy & Health",
    "Stationery & Office",
    "Others",
  ];

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/admin/categories?search=${encodeURIComponent(debouncedSearch)}`
      );
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
      toast.error("Failed to fetch categories");
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
    fetchCategories();
  }, [debouncedSearch, fetchCategories]);

  useEffect(() => {
    if (!loading && wasFocusedRef.current && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/admin/categories", {
        name: newCategoryName,
        allowedUnits: newCategoryUnits.split(",").map((s) => s.trim()),
      });
      if (res.data.success) {
        setCategories([...categories, res.data.category]);
        setNewCategoryName("");
        setNewCategoryUnits("");
        toast.success("Category created successfully");
      } else {
        toast.error(res.data.message || "Failed to create category");
      }
    } catch (error) {
      console.error("Failed to create category", error);
      toast.error("Failed to create category");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        const res = await axios.delete(`/api/admin/categories/${id}`);
        if (res.data.success) {
          setCategories(categories.filter((c) => c._id !== id));
          toast.success("Category deleted successfully");
        } else {
          toast.error(res.data.message || "Failed to delete category");
        }
      } catch (error) {
        console.error("Failed to delete category", error);
        toast.error("Failed to delete category");
      }
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search categories by name..."
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
                <div className="p-6 text-center">Loading categories...</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
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
                        Allowed Units
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
                    {categories.map((cat) => (
                      <tr key={cat._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cat.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cat.allowedUnits.join(", ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat._id)}
                            className="text-red-600 hover:text-red-900"
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
        <div>
          <h2 className="text-xl font-bold mb-6">Add New Category</h2>
          <form
            onSubmit={handleCreate}
            className="bg-white shadow-md rounded-lg p-6"
          >
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category Name
              </label>
              <input
                type="text"
                id="name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="units"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Allowed Units (comma-separated)
              </label>
              <input
                type="text"
                id="units"
                value={newCategoryUnits}
                onChange={(e) => setNewCategoryUnits(e.target.value)}
                placeholder="e.g. kg,g,l,ml,piece"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Create Category
            </button>
          </form>
        </div>
      </div>
      {showEditModal && selectedCategory && (
        <EditCategoryModal
          category={selectedCategory}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchCategories();
          }}
        />
      )}
    </>
  );
};

export default CategoriesPage;
