// src/app/store-manager/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  Boxes, 
  Search, 
  Loader2, 
  Check,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
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

export default function StoreManagerInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Buffer to store individual unsaved stock entries before hitting save
  const [stockInput, setStockInput] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/store-manager/inventory");
      setItems(res.data.inventory || []);
      
      // Initialize inputs with current stock values
      const initialStock: Record<string, string> = {};
      res.data.inventory?.forEach((item: InventoryItem) => {
        initialStock[item.variantId] = item.storeStock.toString();
      });
      setStockInput(initialStock);
    } catch {
      toast.error("Failed to load store inventory catalog");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStock = async (item: InventoryItem) => {
    const value = stockInput[item.variantId];
    if (value === undefined || value.trim() === "" || Number(value) < 0) {
      toast.error("Please enter a valid stock count");
      return;
    }

    const newStock = Number(value);
    setUpdatingId(item.variantId);

    try {
      await axios.put("/api/store-manager/inventory", {
        variantId: item.variantId,
        groceryId: item.groceryId,
        stock: newStock,
      });

      setItems(prevItems => 
        prevItems.map(prev => 
          prev.variantId === item.variantId ? { ...prev, storeStock: newStock } : prev
        )
      );
      toast.success(`Updated stock for ${item.name} (${item.variantLabel}) to ${newStock}`);
    } catch {
      toast.error("Failed to update stock level");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleAvailable = async (item: InventoryItem, nextState: boolean) => {
    setUpdatingId(item.variantId);
    try {
      await axios.put("/api/store-manager/inventory", {
        variantId: item.variantId,
        groceryId: item.groceryId,
        isAvailable: nextState,
      });

      setItems(prevItems => 
        prevItems.map(prev => 
          prev.variantId === item.variantId ? { ...prev, isAvailable: nextState } : prev
        )
      );
      toast.success(`${item.name} availability updated!`);
    } catch {
      toast.error("Failed to change availability status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStockInputChange = (variantId: string, val: string) => {
    setStockInput({
      ...stockInput,
      [variantId]: val.replace(/\D/g, "") // number only
    });
  };

  // Filter items
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.variantLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-green-600" />
            Live Inventory Catalog
          </h1>
          <p className="text-sm text-slate-500">
            Control local stock availability or update inventory levels.
          </p>
        </div>

        <button
          onClick={fetchInventory}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Refresh Catalog
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search items by name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none transition"
        />
      </div>

      {/* Main Grid table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading inventory list...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <Boxes className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Catalog Items Found</h3>
          <p className="text-slate-500 text-sm mt-1">
            Check your search terms or verify that catalog products are seeded.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                  <th className="px-6 py-4">Item details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price details</th>
                  <th className="px-6 py-4 w-40">Local Stock</th>
                  <th className="px-6 py-4 w-32 text-center">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => {
                  const mrp = item.storeMrp ?? item.defaultMrp;
                  const selling = item.storeSelling ?? item.defaultSelling;
                  const hasPriceOverride = item.storeMrp !== null && item.storeSelling !== null;
                  const inputStock = stockInput[item.variantId] || "0";
                  const isStockUnsaved = Number(inputStock) !== item.storeStock;

                  return (
                    <tr key={item.variantId} className="hover:bg-slate-50/30 transition-colors">
                      {/* Product Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                            {item.image ? (
                              <Image 
                                src={item.image} 
                                alt={item.name} 
                                fill
                                sizes="40px"
                                className="object-contain p-1"
                              />
                            ) : (
                              <Boxes className="w-5 h-5 text-slate-300 absolute inset-0 m-auto" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {item.name}
                            </p>
                            <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                              {item.variantLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {item.categoryName}
                      </td>

                      {/* Overridden / Normal Price */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-slate-700 font-semibold">₹{selling}</p>
                          <p className="text-[10px] text-slate-400">MRP: ₹{mrp}</p>
                          {hasPriceOverride && (
                            <span className="inline-block text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 mt-1">
                              Override Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Update Input */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={inputStock}
                            onChange={(e) => handleStockInputChange(item.variantId, e.target.value)}
                            className={`w-16 px-1.5 py-1 text-center font-bold border rounded-lg text-sm outline-none focus:border-green-500 transition ${
                              isStockUnsaved ? "border-amber-400 bg-amber-50/20" : "border-slate-200"
                            }`}
                          />
                          {isStockUnsaved ? (
                            <button
                              onClick={() => handleUpdateStock(item)}
                              disabled={updatingId === item.variantId}
                              className="p-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition cursor-pointer"
                              title="Save Stock Level"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-green-600">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Live Toggle */}
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={(e) => handleToggleAvailable(item, e.target.checked)}
                            className="sr-only peer"
                            disabled={updatingId === item.variantId}
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
