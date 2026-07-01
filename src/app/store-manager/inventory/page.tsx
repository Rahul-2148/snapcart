// src/app/store-manager/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  Boxes, 
  Search, 
  Loader2, 
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X,
  Sliders,
  TrendingUp
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

  // AI Pricing Modal State
  const [selectedOptimizeItem, setSelectedOptimizeItem] = useState<InventoryItem | null>(null);
  const [demandSurge, setDemandSurge] = useState(1.0);
  const [weatherMultiplier, setWeatherMultiplier] = useState(1.0);
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [optimizingPrice, setOptimizingPrice] = useState(false);
  const [optimizedPriceResult, setOptimizedPriceResult] = useState<number | null>(null);

  const handleOpenOptimizer = (item: InventoryItem) => {
    setSelectedOptimizeItem(item);
    setDemandSurge(1.0);
    setWeatherMultiplier(1.0);
    setCompetitorPrice("");
    setOptimizedPriceResult(null);
  };

  const handleCalculateAiPrice = async () => {
    if (!selectedOptimizeItem) return;
    setOptimizingPrice(true);
    try {
      const response = await axios.post("/api/store-manager/inventory/ai-price", {
        variantId: selectedOptimizeItem.variantId,
        basePrice: selectedOptimizeItem.defaultSelling,
        stock: selectedOptimizeItem.storeStock,
        demandSurge,
        weatherMultiplier,
        competitorPrice: competitorPrice ? Number(competitorPrice) : null,
      });

      if (response.data.success) {
        setOptimizedPriceResult(response.data.dynamicPrice);
        toast.success(`Dynamic price calculated: ₹${response.data.dynamicPrice}`);
      }
    } catch {
      toast.error("Failed to run dynamic pricing forecast");
    } finally {
      setOptimizingPrice(false);
    }
  };

  const handleApplyAiPrice = async () => {
    if (!selectedOptimizeItem || optimizedPriceResult === null) return;
    setUpdatingId(selectedOptimizeItem.variantId);
    try {
      await axios.put("/api/store-manager/inventory", {
        variantId: selectedOptimizeItem.variantId,
        groceryId: selectedOptimizeItem.groceryId,
        priceOverride: {
          mrp: selectedOptimizeItem.defaultMrp,
          selling: optimizedPriceResult
        }
      });

      setItems(prevItems => 
        prevItems.map(prev => 
          prev.variantId === selectedOptimizeItem.variantId 
            ? { ...prev, storeMrp: selectedOptimizeItem.defaultMrp, storeSelling: optimizedPriceResult } 
            : prev
        )
      );
      toast.success(`Successfully applied AI optimized price: ₹${optimizedPriceResult}`);
      setSelectedOptimizeItem(null);
    } catch {
      toast.error("Failed to save price override");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPriceOverride = async (item: InventoryItem) => {
    setUpdatingId(item.variantId);
    try {
      await axios.put("/api/store-manager/inventory", {
        variantId: item.variantId,
        groceryId: item.groceryId,
        priceOverride: null
      });

      setItems(prevItems => 
        prevItems.map(prev => 
          prev.variantId === item.variantId 
            ? { ...prev, storeMrp: null, storeSelling: null } 
            : prev
        )
      );
      toast.success(`Restored default price for ${item.name}`);
    } catch {
      toast.error("Failed to restore default price");
    } finally {
      setUpdatingId(null);
    }
  };

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
                        <div className="flex flex-col gap-1.5">
                          <div>
                            <p className="text-slate-700 font-semibold">₹{selling}</p>
                            <p className="text-[10px] text-slate-400">MRP: ₹{mrp}</p>
                          </div>
                          {hasPriceOverride ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-block text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 w-max">
                                Override Active
                              </span>
                              <button
                                type="button"
                                onClick={() => handleResetPriceOverride(item)}
                                className="text-[10px] text-red-600 hover:text-red-700 font-semibold hover:underline text-left cursor-pointer"
                              >
                                Reset Price
                              </button>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleOpenOptimizer(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 mt-1 hover:underline cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 animate-pulse text-emerald-500" />
                            Optimize Price
                          </button>
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

      {/* AI Dynamic Pricing Modal */}
      {selectedOptimizeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="font-bold text-lg">AI Price Optimizer</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOptimizeItem(null)}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto snapcart-scrollbar">
              {/* Product Info Card */}
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
                <div className="relative w-12 h-12 bg-white rounded-lg border border-slate-100 flex-shrink-0 flex items-center justify-center">
                  {selectedOptimizeItem.image ? (
                    <Image 
                      src={selectedOptimizeItem.image} 
                      alt={selectedOptimizeItem.name} 
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <Boxes className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{selectedOptimizeItem.name}</h4>
                  <span className="inline-block text-[10px] text-emerald-800 font-bold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100 mt-1">
                    {selectedOptimizeItem.variantLabel}
                  </span>
                </div>
              </div>

              {/* Current Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Price</span>
                  <p className="text-base font-bold text-slate-800 mt-0.5">₹{selectedOptimizeItem.storeSelling ?? selectedOptimizeItem.defaultSelling}</p>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stock Count</span>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{selectedOptimizeItem.storeStock} items</p>
                </div>
              </div>

              {/* Sliders and Inputs */}
              <div className="space-y-4 pt-2">
                {/* Demand Surge Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      Demand Surge Multiplier
                    </label>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {demandSurge}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.1"
                    value={demandSurge}
                    onChange={(e) => setDemandSurge(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Simulate high demand periods (e.g. festivals, weekends, peak hours).
                  </p>
                </div>

                {/* Weather Multiplier Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Weather Surge Multiplier
                    </label>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {weatherMultiplier}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="1.5"
                    step="0.05"
                    value={weatherMultiplier}
                    onChange={(e) => setWeatherMultiplier(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Adjust pricing due to bad weather conditions affecting delivery availability.
                  </p>
                </div>

                {/* Competitor Price Input */}
                <div>
                  <label htmlFor="competitorPrice" className="block text-xs font-bold text-slate-600 mb-1.5">
                    Competitor Price (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      id="competitorPrice"
                      type="number"
                      placeholder="e.g. 120"
                      value={competitorPrice}
                      onChange={(e) => setCompetitorPrice(e.target.value)}
                      className="w-full pl-7 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Optional target competitor selling price to calculate parity boundaries.
                  </p>
                </div>
              </div>

              {/* Run Calculation Trigger */}
              <button
                type="button"
                onClick={handleCalculateAiPrice}
                disabled={optimizingPrice}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm py-3 rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                {optimizingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Optimizing Price...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Compute AI Dynamic Price
                  </>
                )}
              </button>

              {/* Results View */}
              {optimizedPriceResult !== null && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-emerald-800">Calculated Dynamic Price:</span>
                    <span className="text-xl font-extrabold text-emerald-950">₹{optimizedPriceResult}</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-relaxed">
                    This price has been computed based on supply elasticity, remaining stock ({selectedOptimizeItem.storeStock}), and simulated surge parameters.
                  </p>
                  
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleApplyAiPrice}
                      disabled={updatingId === selectedOptimizeItem.variantId}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2 px-3 rounded-xl active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Apply Price
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptimizedPriceResult(null)}
                      className="px-3.5 py-2 border border-emerald-300 text-emerald-800 font-semibold text-xs rounded-xl hover:bg-emerald-100/50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
