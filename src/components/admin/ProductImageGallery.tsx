"use client";

import Image from "next/image";
import { useState, MouseEvent } from "react";

interface Image {
  url: string;
  _id: string;
}

interface ProductImageGalleryProps {
  images: Image[];
  productName: string;
}

const ProductImageGallery = ({
  images,
  productName,
}: ProductImageGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isZoomed) {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setZoomPosition({ x, y });
    }
  };

  const selectedImage = images[selectedImageIndex]?.url || "/placeholder.png";

  return (
    <div className="flex gap-4">
      {/* Thumbnails */}
      <div className="flex flex-col gap-3">
        {images.map((image, index) => (
          <button
            key={image._id}
            onClick={() => setSelectedImageIndex(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
              selectedImageIndex === index
                ? "border-orange-500 ring-2 ring-orange-200 shadow-lg"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Image
              src={image.url}
              alt={`${productName} ${index + 1}`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        <div
          className="aspect-square relative overflow-hidden cursor-zoom-in group"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          <Image
            src={selectedImage}
            alt={productName}
            fill
            className={`object-contain transition-transform duration-300`}
          />
          {isZoomed && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${selectedImage})`,
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "250%", // zoom level
                opacity: 1,
              }}
            />
          )}
          <div
            className={`absolute inset-0 bg-black/0 ${
              !isZoomed ? "group-hover:bg-black/10" : ""
            } transition-colors duration-300`}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ProductImageGallery;
