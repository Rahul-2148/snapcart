import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "80mb",
    optimizePackageImports: [
      "lucide-react",
      "@heroicons/react",
      "react-icons",
      "recharts",
      "@heroicons/react/24/outline",
      "@heroicons/react/24/solid",
      "framer-motion",
      "motion",
      "sweetalert2"
    ],
  },

  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },
  // Suppress hydration warnings in development (caused by browser extensions)
  devIndicators: {
    position: "bottom-right",
  },

  images: {
    unoptimized: true, // Cloudinary handles optimization, no need for Next.js optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
        pathname: "/**",
      }
    ],
  },
};

export default nextConfig;
