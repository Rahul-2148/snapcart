"use client";
import L, { LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Navigation } from "lucide-react";

// Custom marker icons
const customerIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%233B82F6'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const deliveryIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%2310B981'%3E%3Cpath d='M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3zM3 6v9h.76c.55-.61 1.35-1 2.24-1 .89 0 1.69.39 2.24 1H15V6H3z'/%3E%3C/svg%3E",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const storeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23EF4444'%3E%3Cpath d='M20 4H4v2h16V4zm1 10v-2l-1-5H4L3 12v2c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3zm-10 0H5v-2h6v2zm8 0h-6v-2h6v2zm-2-8H7V7h10v1z'/%3E%3C/svg%3E",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface TrackingMapProps {
  customerLocation: [number, number];
  deliveryLocation?: [number, number];
  storeLocation?: [number, number];
  orderNumber?: string;
  estimatedDistance?: number;
  estimatedTime?: number;
}

const AnimatedMarker = ({
  position,
  icon,
  children,
}: {
  position: [number, number];
  icon: L.Icon;
  children?: React.ReactNode;
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  const [animatedPos, setAnimatedPos] = useState<[number, number]>(position);

  useEffect(() => {
    const start = animatedPos;
    const end = position;
    const duration = 900;
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      setAnimatedPos([lat, lng]);
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(animatedPos as any);
    }
  }, [animatedPos]);

  return (
    <Marker ref={markerRef as any} position={animatedPos} icon={icon}>
      {children}
    </Marker>
  );
};

// Auto-fit map to show all available markers
const AutoFitBounds = ({
  customerLocation,
  deliveryLocation,
  storeLocation,
}: {
  customerLocation: [number, number];
  deliveryLocation?: [number, number];
  storeLocation?: [number, number];
}) => {
  const map = useMap();

  useEffect(() => {
    const points: LatLngExpression[] = [customerLocation as LatLngExpression];
    if (deliveryLocation) points.push(deliveryLocation as LatLngExpression);
    if (storeLocation) points.push(storeLocation as LatLngExpression);

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [customerLocation, deliveryLocation, storeLocation, map]);

  return null;
};

const TrackingMap = ({
  customerLocation,
  deliveryLocation,
  storeLocation,
  orderNumber,
  estimatedDistance,
  estimatedTime,
}: TrackingMapProps) => {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [rerouteTick, setRerouteTick] = useState(0);

  const startPoint = deliveryLocation || storeLocation || customerLocation;
  const endPoint = customerLocation;

  const routeKey = useMemo(
    () =>
      `${startPoint.join(",")}-${endPoint.join(",")}-${rerouteTick}`,
    [startPoint, endPoint, rerouteTick],
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadRoute = async () => {
      if (startPoint[0] === endPoint[0] && startPoint[1] === endPoint[1]) {
        setRoute([]);
        return;
      }
      setRouteLoading(true);
      setRouteError(null);
      try {
        // Primary: OpenRouteService (2000 req/day free, best results)
        const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?start=${startPoint[1]},${startPoint[0]}&end=${endPoint[1]},${endPoint[0]}`;
        
        try {
          const orsRes = await fetch(orsUrl, { signal: controller.signal });
          if (orsRes.ok) {
            const orsData = await orsRes.json();
            if (orsData.features?.[0]?.geometry?.coordinates) {
              const coords = orsData.features[0].geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]] as [number, number]
              );
              setRoute(coords);
              setRouteLoading(false);
              return;
            }
          }
        } catch (orsError) {
          console.log('OpenRouteService failed, trying OSRM...');
        }
        
        // Fallback: OSRM (free, no limits)
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startPoint[1]},${startPoint[0]};${endPoint[1]},${endPoint[0]}?overview=full&geometries=geojson`;
        const osrmRes = await fetch(osrmUrl, { signal: controller.signal });
        const osrmData = await osrmRes.json();
        
        if (!osrmRes.ok || osrmData?.code !== "Ok") {
          throw new Error("Both routing services failed");
        }
        
        const coords = osrmData?.routes?.[0]?.geometry?.coordinates || [];
        const mapped = coords.map((c: [number, number]) => [c[1], c[0]]);
        setRoute(mapped);
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          setRoute([]);
          setRouteError("Route unavailable");
        }
      } finally {
        setRouteLoading(false);
      }
    };

    loadRoute();
    return () => controller.abort();
  }, [routeKey, startPoint, endPoint]);

  const center: [number, number] = useMemo(() => {
    const locs: [number, number][] = [customerLocation];
    if (deliveryLocation) locs.push(deliveryLocation);
    if (storeLocation) locs.push(storeLocation);
    
    const sumLat = locs.reduce((acc, curr) => acc + curr[0], 0);
    const sumLng = locs.reduce((acc, curr) => acc + curr[1], 0);
    return [sumLat / locs.length, sumLng / locs.length];
  }, [customerLocation, deliveryLocation, storeLocation]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute right-4 top-4 z-[1000] flex items-center gap-2">
        {routeError && (
          <span className="bg-white/90 text-xs text-orange-700 px-2 py-1 rounded shadow">
            {routeError}
          </span>
        )}
        <button
          type="button"
          onClick={() => setRerouteTick((prev) => prev + 1)}
          disabled={routeLoading}
          className="bg-white/95 text-gray-800 text-xs px-3 py-2 rounded shadow hover:bg-white disabled:opacity-60"
        >
          {routeLoading ? "Rerouting..." : "Reroute"}
        </button>
      </div>
      <MapContainer
        center={center as LatLngExpression}
        zoom={13}
        scrollWheelZoom
        className="w-full h-full rounded-lg"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds
          customerLocation={customerLocation}
          deliveryLocation={deliveryLocation}
          storeLocation={storeLocation}
        />

        {/* Route line between source and destination */}
        <Polyline
          positions={
            route.length > 1
              ? (route as LatLngExpression[])
              : ([
                  startPoint as LatLngExpression,
                  endPoint as LatLngExpression,
                ] as LatLngExpression[])
          }
          pathOptions={{
            color: "#3B82F6",
            weight: 3,
            opacity: 0.8,
          }}
        />

        {/* Customer marker */}
        <Marker position={customerLocation} icon={customerIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-blue-600">📍 Your Location</p>
              <p className="text-xs text-gray-600">Order #{orderNumber}</p>
              <p className="text-xs text-gray-500 mt-1">Delivery destination</p>
            </div>
          </Popup>
        </Marker>

        {/* Store marker */}
        {storeLocation && (
          <Marker position={storeLocation} icon={storeIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-red-600">🏬 Dark Store Outlet</p>
                <p className="text-xs text-gray-500 mt-1">Fulfillment Source</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery partner marker */}
        {deliveryLocation && (
          <AnimatedMarker position={deliveryLocation} icon={deliveryIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-green-600">🚴 Delivery Partner</p>
                <p className="text-xs text-gray-600">On the way</p>
                {estimatedDistance && estimatedTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    {estimatedDistance.toFixed(1)} km · {estimatedTime} min
                  </p>
                )}
              </div>
            </Popup>
          </AnimatedMarker>
        )}
      </MapContainer>

      {/* Floating info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg z-[1000]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-white p-2 rounded-full">
              <Navigation size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {deliveryLocation
                  ? "Delivery Partner is on the way"
                  : "Preparing order in dark store"}
              </p>
              <p className="text-xs text-gray-600">
                {deliveryLocation
                  ? "Live tracking updates every 10 seconds"
                  : "Rider assignment pending"}
              </p>
            </div>
          </div>
          {estimatedDistance && estimatedTime && (
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                {estimatedTime} min
              </p>
              <p className="text-xs text-gray-500">
                {estimatedDistance.toFixed(1)} km away
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TrackingMap;
