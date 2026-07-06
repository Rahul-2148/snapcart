// src/app/admin/stores/[id]/inventory/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { 
  ArrowLeft, 
  Search, 
  Save, 
  RotateCcw, 
  Boxes, 
  Loader2,
  Check,
  AlertTriangle
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface InventoryItem {
  variantId: string;
  groceryId: string;
  name: string;
  image: string;
  variantLabel: string;
  categoryName: string;
  defaultMrp: number;
  defaultSelling: number;
  storeStock: number;
  storeMrp: number | null;
  storeSelling: number | null;
  isAvailable: boolean;
}

export default function AdminStoreInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editedItems, setEditedItems] = useState<Record<string, Partial<InventoryItem>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchInventory();
  }, [storeId]);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/admin/stores/${storeId}/inventory`);
      setStoreName(res.data.storeName || "Dark Store");
      const inventory = res.data.inventory || [];
      setItems(inventory);
      
      // Extract unique categories
      const cats = Array.from(new Set(inventory.map((item: InventoryItem) => item.categoryName))) as string[];
      setCategories(cats);
      setEditedItems({});
    } catch (error) {
      console.error("Failed to load store inventory", error);
      toast.error("Failed to load store inventory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (variantId: string, field: keyof InventoryItem, value: any) => {
    const originalItem = items.find(item => item.variantId === variantId);
    if (!originalItem) return;

    // Track edited properties
    const itemEdits = editedItems[variantId] || {};
    const updatedEdits = { ...itemEdits, [field]: value };

    // If change reverted back to original, remove that specific field edit
    if (originalItem[field] === value) {
      delete updatedEdits[field];
    }

    // Update edited state
    if (Object.keys(updatedEdits).length === 0) {
      const newEdits = { ...editedItems };
      delete newEdits[variantId];
      setEditedItems(newEdits);
    } else {
      setEditedItems({
        ...editedItems,
        [variantId]: updatedEdits
      });
    }

    // Local UI feedback update
    setItems(prevItems => 
      prevItems.map(item => 
        item.variantId === variantId ? { ...item, [field]: value } : item
      )
    );
  };

  // Toggle Override helper
  const handleToggleOverride = (variantId: string, checked: boolean) => {
    const item = items.find(i => i.variantId === variantId);
    if (!item) return;

    if (checked) {
      // Initialize custom overrides with defaults
      handleFieldChange(variantId, "storeMrp", item.storeMrp || item.defaultMrp);
      handleFieldChange(variantId, "storeSelling", item.storeSelling || item.defaultSelling);
    } else {
      // Unset custom overrides
      handleFieldChange(variantId, "storeMrp", null);
      handleFieldChange(variantId, "storeSelling", null);
    }
  };

  const handleSave = async () => {
    const numChanges = Object.keys(editedItems).length;
    if (numChanges === 0) {
      toast.info("No modifications to save.");
      return;
    }

    setIsSaving(true);
    try {
      // Build updates payload
      const updates = Object.keys(editedItems).map(variantId => {
        const item = items.find(i => i.variantId === variantId)!;
        return {
          variantId,
          groceryId: item.groceryId,
          stock: item.storeStock,
          mrp: item.storeMrp,
          selling: item.storeSelling,
          isAvailable: item.isAvailable,
        };
      });

      await axios.post(`/api/admin/stores/${storeId}/inventory`, { updates });
      toast.success("Store inventory overrides saved successfully!");
      setEditedItems({});
      fetchInventory();
    } catch (error) {
      console.error("Failed to save inventory updates", error);
      toast.error("Failed to save updates.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.variantLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
      selectedCategory === "all" || item.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const unsavedCount = Object.keys(editedItems).length;

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Top Bar Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Link 
          href="/admin/stores" 
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Store Inventory Overrides
          </h1>
          <p className="text-sm text-slate-500">
            Configure overrides for <strong className="text-green-600 font-semibold">{storeName}</strong>
          </p>
        </div>
      </div>

      {/* Control panel & filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product or variant label..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 transition"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white focus:border-green-500 transition"
          >
            <option value="all">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-3">
          {unsavedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              {unsavedCount} Unsaved Changes
            </div>
          )}

          <button
            onClick={fetchInventory}
            disabled={isLoading || isSaving}
            className="flex items-center justify-center p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50"
            title="Reset Changes"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleSave}
            disabled={isLoading || isSaving || unsavedCount === 0}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg hover:shadow-green-100 disabled:opacity-50 transition cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Overrides
          </button>
        </div>
      </div>

      {/* Inventory Override Sheet */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading catalog items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <Boxes className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Groceries Found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Try checking spelling or choose a different category filter.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                  <th className="px-6 py-4">Product details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 w-32">Local Stock</th>
                  <th className="px-6 py-4 w-40">Default Prices</th>
                  <th className="px-6 py-4 w-52">Price Override (MRP / Selling)</th>
                  <th className="px-6 py-4 w-32 text-center">Serviceable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => {
                  const hasPriceOverride = item.storeMrp !== null && item.storeSelling !== null;
                  const isEdited = !!editedItems[item.variantId];

                  return (
                    <tr 
                      key={item.variantId} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isEdited ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Product Name & details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                            {item.image ? (
                              <Image 
                                src={item.image} 
                                alt={item.name} 
                                fill 
                                sizes="48px"
                                className="object-contain p-1"
                              />
                            ) : (
                              <Boxes className="w-6 h-6 text-slate-300 absolute inset-0 m-auto" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {item.name}
                            </p>
                            <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                              {item.variantLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {item.categoryName}
                      </td>

                      {/* Local Stock Count */}
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          value={item.storeStock}
                          onChange={(e) => handleFieldChange(item.variantId, "storeStock", Math.max(0, Number(e.target.value)))}
                          className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-center font-semibold text-slate-700 outline-none focus:border-green-500 transition"
                        />
                      </td>

                      {/* Default Catalog Prices */}
                      <td className="px-6 py-4 text-slate-500">
                        <p className="text-xs">MRP: ₹{item.defaultMrp}</p>
                        <p className="text-xs font-semibold text-slate-700">Selling: ₹{item.defaultSelling}</p>
                      </td>

                      {/* Custom Overrides */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={hasPriceOverride}
                              onChange={(e) => handleToggleOverride(item.variantId, e.target.checked)}
                              className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                            />
                            Use price override
                          </label>

                          {hasPriceOverride && (
                            <div className="flex items-center gap-2">
                              <div className="relative w-20">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">MRP</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="MRP"
                                  value={item.storeMrp ?? ""}
                                  onChange={(e) => handleFieldChange(item.variantId, "storeMrp", Number(e.target.value))}
                                  className="w-full pl-9 pr-1.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-green-500"
                                />
                              </div>
                              <div className="relative w-20">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Sell</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Sell"
                                  value={item.storeSelling ?? ""}
                                  onChange={(e) => handleFieldChange(item.variantId, "storeSelling", Number(e.target.value))}
                                  className="w-full pl-9 pr-1.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-green-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Available Switch */}
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={(e) => handleFieldChange(item.variantId, "isAvailable", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
