import React from "react";

interface LoaderProps {
  fullscreen?: boolean;
  size?: "small" | "medium" | "large";
  text?: string;
  variant?: "default" | "snapcart";
}

const Loader: React.FC<LoaderProps> = ({
  fullscreen = false,
  size = "medium",
  text = "Loading...",
  variant = "snapcart",
}) => {
  const sizeClasses = {
    small: "w-10 h-10",
    medium: "w-16 h-16",
    large: "w-24 h-24",
  };

  // Snapcart premium theme loader
  if (variant === "snapcart") {
    const loaderContent = (
      <div className="flex flex-col items-center justify-center gap-6">
        <style>{`
          @keyframes snapcart-ring-spin {
            0% { transform: rotate(0deg) scaleY(1); }
            50% { transform: rotate(180deg) scaleY(0.8); }
            100% { transform: rotate(360deg) scaleY(1); }
          }
          
          @keyframes snapcart-inner-spin {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          
          @keyframes snapcart-dot-pulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 1;
            }
            50% { 
              transform: scale(1.3);
              opacity: 0.8;
            }
          }
          
          @keyframes snapcart-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          
          .snapcart-ring {
            animation: snapcart-ring-spin 3s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          }
          
          .snapcart-inner {
            animation: snapcart-inner-spin 2s linear infinite;
          }
          
          .snapcart-dot {
            animation: snapcart-dot-pulse 1.5s ease-in-out infinite;
          }
          
          .snapcart-float {
            animation: snapcart-float 2s ease-in-out infinite;
          }
        `}</style>

        {/* Main Container */}
        <div className={`${sizeClasses[size]} relative snapcart-float`}>
          {/* Outer glow circle */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-green-200 via-transparent to-orange-200 opacity-30 blur-xl"></div>

          {/* Main spinner with dual ring effect */}
          <div className="relative w-full h-full">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-500 border-r-orange-400 snapcart-ring shadow-lg"></div>

            {/* Inner counter-rotating ring */}
            <div className="absolute inset-1 rounded-full border-2 border-transparent border-b-green-400 border-l-orange-500 snapcart-inner opacity-70"></div>

            {/* Center gradient orb */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-orange-500 snapcart-dot shadow-lg"></div>
            </div>
          </div>
        </div>

        {/* Loading Text with styling */}
        {text && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">
              <span className="text-base font-semibold bg-gradient-to-r from-green-600 to-orange-600 bg-clip-text text-transparent">
                {text}
              </span>
            </p>
            {/* Animated dots */}
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                style={{ animationDelay: "0s" }}
              ></span>
              <span
                className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></span>
              <span
                className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></span>
            </div>
          </div>
        )}
      </div>
    );

    if (fullscreen) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-white via-green-50/30 to-white backdrop-blur-sm flex items-center justify-center z-50">
          {loaderContent}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center py-16">
        {loaderContent}
      </div>
    );
  }

  // Default loader (fallback)
  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin`}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      </div>

      {text && <p className="text-gray-600 text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {loaderContent}
    </div>
  );
};

export default Loader;
