// src/app/admin/stores/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Clock, 
  Truck, 
  User, 
  Phone,
  Search,
  X,
  Store,
  Boxes,
  Loader2,
  ChevronRight,
  Globe
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import StoreLocationPickerModal from "@/components/location/StoreLocationPickerModal";

interface Manager {
  _id: string;
  name: string;
  email: string;
}

interface IStore {
  _id: string;
  name: string;
  slug: string;
  location: {
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
    district?: string;
    area?: string;
    pincode: string;
  };
  serviceRadiusKm: number;
  openingHours: {
    open: string;
    close: string;
  };
  status: "active" | "inactive" | "maintenance";
  deliveryFee: {
    base: number;
    freeAbove: number;
  };
  estimatedDeliveryMinutes: {
    min: number;
    max: number;
  };
  contactPhone?: string;
  manager?: Manager | null;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<IStore[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Regional Filter States
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // UI Preference & Pagination States
  const [showExplorer, setShowExplorer] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const storesPerPage = 6;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<IStore | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("7");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [status, setStatus] = useState<"active" | "inactive" | "maintenance">("active");
  const [baseDeliveryFee, setBaseDeliveryFee] = useState("15");
  const [freeAboveDeliveryFee, setFreeAboveDeliveryFee] = useState("199");
  const [minDeliveryMinutes, setMinDeliveryMinutes] = useState("8");
  const [maxDeliveryMinutes, setMaxDeliveryMinutes] = useState("15");
  const [contactPhone, setContactPhone] = useState("");
  const [assignedManager, setAssignedManager] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const handleMapConfirm = (lat: number, lng: number, details: any) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    if (details.address) setAddress(details.address);
    if (details.city) setCity(details.city);
    if (details.state) setState(details.state);
    if (details.district) setDistrict(details.district);
    if (details.area) setArea(details.area);
    if (details.pincode) setPincode(details.pincode);
    toast.success("Store location and address details resolved!");
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset pagination to first page whenever search query or location filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedDistrict, selectedCity, selectedArea, selectedStoreId, searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [storesRes, managersRes] = await Promise.all([
        axios.get("/api/admin/stores"),
        axios.get("/api/admin/store-managers"),
      ]);
      setStores(storesRes.data.stores || []);
      setManagers(managersRes.data.managers || []);
    } catch (error) {
      console.error("Failed to load stores data", error);
      toast.error("Failed to load stores or managers");
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically extract dropdown choices based on currently selected values
  const statesList = Array.from(
    new Set(stores.map((s) => s.location.state).filter(Boolean))
  ).sort();

  const districtsList = selectedState
    ? Array.from(
        new Set(
          stores
            .filter((s) => s.location.state === selectedState)
            .map((s) => s.location.district)
            .filter(Boolean)
        )
      ).sort()
    : [];

  const citiesList = (selectedState && selectedDistrict)
    ? Array.from(
        new Set(
          stores
            .filter(
              (s) =>
                s.location.state === selectedState &&
                s.location.district === selectedDistrict
            )
            .map((s) => s.location.city)
            .filter(Boolean)
        )
      ).sort()
    : [];

  const areasList = (selectedState && selectedDistrict && selectedCity)
    ? Array.from(
        new Set(
          stores
            .filter(
              (s) =>
                s.location.state === selectedState &&
                s.location.district === selectedDistrict &&
                s.location.city === selectedCity
            )
            .map((s) => s.location.area)
            .filter(Boolean)
        )
      ).sort()
    : [];

  const handleOpenAddModal = () => {
    setEditingStore(null);
    setName("");
    setLongitude("");
    setLatitude("");
    setAddress("");
    setCity("");
    setState("");
    setDistrict("");
    setArea("");
    setPincode("");
    setServiceRadiusKm("7");
    setOpenTime("06:00");
    setCloseTime("23:00");
    setStatus("active");
    setBaseDeliveryFee("15");
    setFreeAboveDeliveryFee("199");
    setMinDeliveryMinutes("8");
    setMaxDeliveryMinutes("15");
    setContactPhone("");
    setAssignedManager("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (store: IStore) => {
    setEditingStore(store);
    setName(store.name);
    setLongitude(store.location.coordinates[0].toString());
    setLatitude(store.location.coordinates[1].toString());
    setAddress(store.location.address);
    setCity(store.location.city);
    setState(store.location.state);
    setDistrict(store.location.district || "");
    setArea(store.location.area || "");
    setPincode(store.location.pincode);
    setServiceRadiusKm(store.serviceRadiusKm.toString());
    setOpenTime(store.openingHours.open);
    setCloseTime(store.openingHours.close);
    setStatus(store.status);
    setBaseDeliveryFee(store.deliveryFee.base.toString());
    setFreeAboveDeliveryFee(store.deliveryFee.freeAbove.toString());
    setMinDeliveryMinutes(store.estimatedDeliveryMinutes.min.toString());
    setMaxDeliveryMinutes(store.estimatedDeliveryMinutes.max.toString());
    setContactPhone(store.contactPhone || "");
    setAssignedManager(store.manager?._id || "");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !longitude || !latitude || !address || !city || !state || !pincode) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const dataPayload = {
      name,
      longitude: Number(longitude),
      latitude: Number(latitude),
      address,
      city,
      state,
      district,
      area,
      pincode,
      serviceRadiusKm: Number(serviceRadiusKm),
      openTime,
      closeTime,
      status,
      baseDeliveryFee: Number(baseDeliveryFee),
      freeAboveDeliveryFee: Number(freeAboveDeliveryFee),
      minDeliveryMinutes: Number(minDeliveryMinutes),
      maxDeliveryMinutes: Number(maxDeliveryMinutes),
      contactPhone,
      manager: assignedManager || null,
    };

    try {
      if (editingStore) {
        await axios.put(`/api/admin/stores/${editingStore._id}`, dataPayload);
        toast.success("Store updated successfully!");
      } else {
        await axios.post("/api/admin/stores", dataPayload);
        toast.success("Store created successfully!");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dark store?")) return;

    try {
      await axios.delete(`/api/admin/stores/${id}`);
      toast.success("Store deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete store");
    }
  };

  const handleAutoDetectCoordinates = async () => {
    if (!address || !city || !state) {
      toast.error("Please fill in Street Address, City, and State first.");
      return;
    }

    setIsGeocoding(true);
    const fullQueryString = `${address}, ${area ? area + ", " : ""}${city}, ${district ? district + ", " : ""}${state}, ${pincode ? pincode + ", " : ""}India`;
    
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQueryString)}&format=json&limit=1`,
        {
          headers: {
            "Accept-Language": "en"
          }
        }
      );

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setLatitude(parseFloat(lat).toFixed(6));
        setLongitude(parseFloat(lon).toFixed(6));
        toast.success("Coordinates successfully geo-detected!");
      } else {
        // Fallback: search with Area, City and State
        const fallbackQuery = `${area ? area + ", " : ""}${city}, ${state}, India`;
        const fbResponse = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`
        );

        if (fbResponse.data && fbResponse.data.length > 0) {
          const { lat, lon } = fbResponse.data[0];
          setLatitude(parseFloat(lat).toFixed(6));
          setLongitude(parseFloat(lon).toFixed(6));
          toast.warning("Exact address not found. Using local district/area center coords.");
        } else {
          toast.error("Could not locate this address. Please fill coordinates manually.");
        }
      }
    } catch (error) {
      console.error("Geocoding failed", error);
      toast.error("Coordinates lookup service failed. Please check internet or type manually.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Filter stores by selections and search query
  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.location.pincode.includes(searchTerm);

    const matchesState = !selectedState || store.location.state === selectedState;
    const matchesDistrict = !selectedDistrict || store.location.district === selectedDistrict;
    const matchesCity = !selectedCity || store.location.city === selectedCity;
    const matchesArea = !selectedArea || store.location.area === selectedArea;
    const matchesStoreId = !selectedStoreId || store._id === selectedStoreId;

    return matchesSearch && matchesState && matchesDistrict && matchesCity && matchesArea && matchesStoreId;
  });

  const handleClearFilters = () => {
    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedCity(null);
    setSelectedArea(null);
    setSelectedStoreId(null);
  };

  // Pagination Calculations
  const totalStoresCount = filteredStores.length;
  const totalPages = Math.ceil(totalStoresCount / storesPerPage);
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * storesPerPage,
    currentPage * storesPerPage
  );

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-green-600" />
            Dark Store Operations Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure local hyper-local outlets, delivery radii, fee structures, and store managers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-3 rounded-xl border border-slate-200 transition cursor-pointer text-sm"
          >
            <Globe className="w-4.5 h-4.5 text-slate-500" />
            {showExplorer ? "Hide Regional Explorer" : "Show Regional Explorer"}
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-3 rounded-xl shadow-lg hover:shadow-green-100 transition-all cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            Add Dark Store
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left column: Streamlined dropdown filters (Show/Hide conditional) */}
        {showExplorer && (
          <div className="w-full lg:w-80 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5 flex-shrink-0 self-start transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-green-600" />
                Regional Explorer
              </h3>
              {(selectedState || selectedDistrict || selectedCity || selectedArea || selectedStoreId) && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* State Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  1. Select State
                </label>
                <select
                  value={selectedState || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedState(val);
                    setSelectedDistrict(null);
                    setSelectedCity(null);
                    setSelectedArea(null);
                    setSelectedStoreId(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:border-green-500 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="">All States (🇮🇳 India)</option>
                  {statesList.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* District Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  2. Select District
                </label>
                <select
                  value={selectedDistrict || ""}
                  disabled={!selectedState}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedDistrict(val);
                    setSelectedCity(null);
                    setSelectedArea(null);
                    setSelectedStoreId(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-50/50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:border-green-500 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="">All Districts</option>
                  {districtsList.map((dst) => (
                    <option key={dst} value={dst}>{dst}</option>
                  ))}
                </select>
              </div>

              {/* City Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  3. Select City
                </label>
                <select
                  value={selectedCity || ""}
                  disabled={!selectedDistrict}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedCity(val);
                    setSelectedArea(null);
                    setSelectedStoreId(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-50/50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:border-green-500 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="">All Cities</option>
                  {citiesList.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              {/* Area Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  4. Select Area / Locality
                </label>
                <select
                  value={selectedArea || ""}
                  disabled={!selectedCity}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedArea(val);
                    setSelectedStoreId(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-50/50 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:border-green-500 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="">All Areas</option>
                  {areasList.map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of matching stores under selection directory */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Serviced Stores ({filteredStores.length})
              </h4>
              <div className="max-h-[35vh] overflow-y-auto pr-1 space-y-1.5">
                {filteredStores.map((store) => {
                  const isSelected = selectedStoreId === store._id;
                  return (
                    <button
                      key={store._id}
                      onClick={() => {
                        setSelectedState(store.location.state);
                        setSelectedDistrict(store.location.district || null);
                        setSelectedCity(store.location.city);
                        setSelectedArea(store.location.area || null);
                        setSelectedStoreId(store._id);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        isSelected
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-bold truncate">{store.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {store.location.area || store.location.city}
                        </p>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-green-600 translate-x-0.5" : "text-slate-400"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right column: Search, Stats, Outlets grid list */}
        <div className="flex-1 w-full space-y-5">
          {/* Search and Filters panel */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-100">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search stores by name, city, or pincode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
              />
            </div>
          </div>

          {/* Current filters breadcrumbs info */}
          {(selectedState || selectedDistrict || selectedCity || selectedArea || selectedStoreId) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span>Selected Region:</span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">India</span>
              {selectedState && <ChevronRight className="w-3 h-3 text-slate-400" />}
              {selectedState && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                  {selectedState}
                </span>
              )}
              {selectedDistrict && <ChevronRight className="w-3 h-3 text-slate-400" />}
              {selectedDistrict && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                  {selectedDistrict}
                </span>
              )}
              {selectedCity && <ChevronRight className="w-3 h-3 text-slate-400" />}
              {selectedCity && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                  {selectedCity}
                </span>
              )}
              {selectedArea && <ChevronRight className="w-3 h-3 text-slate-400" />}
              {selectedArea && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md font-bold">
                  {selectedArea}
                </span>
              )}
              {selectedStoreId && <ChevronRight className="w-3 h-3 text-slate-400" />}
              {selectedStoreId && (
                <span className="px-2 py-0.5 bg-green-600 text-white rounded-md font-bold">
                  {stores.find(s => s._id === selectedStoreId)?.name}
                </span>
              )}
            </div>
          )}

          {/* Stores List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl">
              <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Loading dark stores...</p>
            </div>
          ) : paginatedStores.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No Outlets Available</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                No stores found matching the chosen search query or selected regional filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedStores.map((store) => (
                  <div
                    key={store._id}
                    className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Store Details Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">
                            {store.name}
                          </h3>
                          <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                            ID: {store._id.slice(-8).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                            store.status === "active"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : store.status === "maintenance"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {store.status}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-sm text-slate-600">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-700 truncate max-w-[240px]">
                              {store.location.address}
                            </p>
                            <p className="text-xs text-slate-500">
                              {store.location.area && `${store.location.area}, `}
                              {store.location.city}, {store.location.district && `${store.location.district}, `}
                              {store.location.state} - {store.location.pincode}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>
                            Hours: {store.openingHours.open} - {store.openingHours.close}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span>
                            Radius: {store.serviceRadiusKm} km | Fee: ₹{store.deliveryFee.base} (Free &gt; ₹{store.deliveryFee.freeAbove})
                          </span>
                        </div>

                        {store.contactPhone && (
                          <div className="flex items-center gap-2.5">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{store.contactPhone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-100 mt-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="truncate">
                            Manager:{" "}
                            <strong className="text-slate-800">
                              {store.manager ? store.manager.name : "Unassigned"}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/stores/${store._id}/inventory`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:text-green-800 px-3 py-2 rounded-lg transition"
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        Inventory Overrides
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(store)}
                          className="p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                          title="Edit Store"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStore(store._id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer"
                          title="Delete Store"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm mt-6">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {Math.min(totalStoresCount, (currentPage - 1) * storesPerPage + 1)} - {Math.min(totalStoresCount, currentPage * storesPerPage)} of {totalStoresCount} stores
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-55 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-bold text-slate-700">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-55 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {editingStore ? "Edit Dark Store" : "Create New Dark Store"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SnapCart Indiranagar"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 100 Feet Road, HAL 2nd Stage"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Bangalore Urban"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Area / Locality */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Area / Locality *
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Indiranagar"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="e.g. 560038"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Coordinates & Location Picker */}
                <div className="col-span-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                        📍 Store Location & Coordinates
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Define coordinates and address using our interactive map pin selector.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      🗺️ Pin Store on Map
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
                        Latitude *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        readOnly
                        value={latitude}
                        placeholder="Select location on map"
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        readOnly
                        value={longitude}
                        placeholder="Select location on map"
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Radius */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Service Radius (km) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={serviceRadiusKm}
                    onChange={(e) => setServiceRadiusKm(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Open Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Opening Hour *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00"
                    required
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Close Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Closing Hour *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 23:00"
                    required
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Base Delivery Fee */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Base Delivery Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={baseDeliveryFee}
                    onChange={(e) => setBaseDeliveryFee(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Free Above Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Free Delivery Above (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={freeAboveDeliveryFee}
                    onChange={(e) => setFreeAboveDeliveryFee(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Min Delivery ETA */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Min ETA (mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minDeliveryMinutes}
                    onChange={(e) => setMinDeliveryMinutes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Max Delivery ETA */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Max ETA (mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxDeliveryMinutes}
                    onChange={(e) => setMaxDeliveryMinutes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                {/* Manager */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Assigned Store Manager
                  </label>
                  <select
                    value={assignedManager}
                    onChange={(e) => setAssignedManager(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-green-500 outline-none cursor-pointer"
                  >
                    <option value="">Unassigned (None)</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-green-50 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingStore ? "Save Changes" : "Create Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StoreLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialPosition={latitude && longitude ? [Number(latitude), Number(longitude)] : [28.6139, 77.209]}
        onConfirm={handleMapConfirm}
      />
    </div>
  );
}
