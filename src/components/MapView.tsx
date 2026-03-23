"use client";
import L, { LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Circle,
  useMap,
} from "react-leaflet";
import { useEffect, useRef } from "react";
import mapPin from "@/assets/mapPin.png";
import { motion } from "motion/react";
import { LocateFixed } from "lucide-react";

const markerIcon = new L.Icon({
  iconUrl: mapPin.src,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface MapViewProps {
  position: [number, number];
  radius?: number;
  onPositionChange?: (pos: [number, number]) => void;
  handleCurrentLocation?: () => void;
}

// Recenter map when position changes
const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position as LatLngExpression, 15, { animate: true });
  }, [position, map]);

  return null;
};

const MapView = ({
  position,
  radius = 1000,
  onPositionChange,
  handleCurrentLocation,
}: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    return () => {
      // Clean up Leaflet map instance on unmount to avoid "container reused" errors
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // swallow - removing during teardown can occasionally throw
        }
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        key={`${position[0]}_${position[1]}`}
        center={position as LatLngExpression}
        zoom={15}
        scrollWheelZoom
        doubleClickZoom
        touchZoom
        dragging
        className="w-full h-full rounded-lg"
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap position={position} />

        <Marker
          position={position}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (e: any) => {
              const latlng = e?.target?.getLatLng?.();
              if (latlng) onPositionChange?.([latlng.lat, latlng.lng]);
            },
          }}
        >
          <Popup>Drag me to your location</Popup>
        </Marker>

        <Circle
          center={position}
          radius={radius}
          pathOptions={{
            color: "#34D399",
            fillColor: "#A7F3D0",
            fillOpacity: 0.2,
          }}
        />
      </MapContainer>

      <motion.button
        title="Current Location"
        whileTap={{ scale: 0.93 }}
        className="absolute bottom-4 right-4 bg-green-600 text-white shadow-lg rounded-full p-3 hover:bg-green-700 transition-all flex items-center justify-center z-10"
        onClick={handleCurrentLocation}
      >
        <LocateFixed size={22} />
      </motion.button>
    </div>
  );
};

export default MapView;
