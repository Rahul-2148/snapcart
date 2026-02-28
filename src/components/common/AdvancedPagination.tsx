// src/components/common/AdvancedPagination.tsx
"use client";

import React, { useState } from "react";

interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  showJumpToPage?: boolean;
  className?: string;
}

const AdvancedPagination: React.FC<AdvancedPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [6, 12, 24, 48, 96],
  showItemsPerPage = true,
  showJumpToPage = true,
  className = "",
}) => {
  const [jumpToPage, setJumpToPage] = useState("");

  // Generate pagination numbers with ellipsis
  const generatePaginationNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Handle jump to page
  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage("");
    }
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div className={`space-y-6 bg-white p-6 rounded-lg shadow-sm ${className}`}>
      {/* Pagination Info & Items Per Page */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
        <div>
          Showing{" "}
          <span className="font-semibold text-gray-900">{startItem}</span> to{" "}
          <span className="font-semibold text-gray-900">{endItem}</span> of{" "}
          <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
          items
        </div>

        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="whitespace-nowrap">
              Items per page:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1); // Reset to first page
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Buttons */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
            title="First Page"
            aria-label="Go to first page"
          >
            First
          </button>

          {/* Previous */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            aria-label="Go to previous page"
          >
            Previous
          </button>

          {/* Page Numbers with Ellipsis */}
          {generatePaginationNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === "..." ? (
                <span className="px-3 py-2 text-gray-400" aria-hidden="true">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`px-4 py-2 rounded-lg transition min-w-[44px] ${
                    currentPage === page
                      ? "bg-green-500 text-white font-semibold shadow-md"
                      : "border border-gray-300 hover:bg-gray-50"
                  }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Next */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            aria-label="Go to next page"
          >
            Next
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
            title="Last Page"
            aria-label="Go to last page"
          >
            Last
          </button>
        </div>
      )}

      {/* Jump to Page */}
      {showJumpToPage && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-200">
          <label htmlFor="jumpToPage" className="text-sm text-gray-600">
            Jump to page:
          </label>
          <input
            id="jumpToPage"
            type="number"
            min="1"
            max={totalPages}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleJumpToPage();
              }
            }}
            placeholder={`1-${totalPages}`}
            className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-center"
            aria-label={`Jump to page (1 to ${totalPages})`}
          />
          <button
            onClick={handleJumpToPage}
            disabled={
              !jumpToPage ||
              parseInt(jumpToPage) < 1 ||
              parseInt(jumpToPage) > totalPages
            }
            className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            aria-label="Go to entered page"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedPagination;
