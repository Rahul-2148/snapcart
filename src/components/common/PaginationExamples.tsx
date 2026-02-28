// Example: How to use AdvancedPagination in your own pages

import React, { useState } from "react";
import AdvancedPagination from "@/components/common/AdvancedPagination";

// Example 1: Basic Usage
export function BasicPaginationExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Your data
  const allProducts = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
  }));
  
  // Calculate pagination
  const totalPages = Math.ceil(allProducts.length / itemsPerPage);
  const paginatedProducts = allProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      {/* Display products */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {paginatedProducts.map(product => (
          <div key={product.id} className="p-4 border rounded">
            {product.name}
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <AdvancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={allProducts.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}

// Example 2: With Filters
export function FilteredPaginationExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [searchQuery, setSearchQuery] = useState("");
  
  const allItems = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
  }));
  
  // Filter items based on search
  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search items..."
        className="mb-4 px-4 py-2 border rounded w-full"
      />
      
      {/* Items */}
      <div className="space-y-2 mb-6">
        {paginatedItems.map(item => (
          <div key={item.id} className="p-3 border rounded">
            {item.name} - Category: {item.category}
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <AdvancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredItems.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}

// Example 3: Minimal (No Options)
export function MinimalPaginationExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Fixed
  
  const data = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="mb-6">
        {paginatedData.map(item => (
          <div key={item.id}>Item {item.id}</div>
        ))}
      </div>
      
      {/* Simple pagination without options */}
      <AdvancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={data.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        showItemsPerPage={false}
        showJumpToPage={false}
      />
    </div>
  );
}

// Example 4: Admin Table with Pagination
export function AdminTablePaginationExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const tableData = Array.from({ length: 150 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    status: i % 2 === 0 ? "Active" : "Inactive",
  }));
  
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const paginatedData = tableData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Table */}
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">ID</th>
            <th className="px-6 py-3 text-left">Name</th>
            <th className="px-6 py-3 text-left">Email</th>
            <th className="px-6 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(row => (
            <tr key={row.id} className="border-t">
              <td className="px-6 py-4">{row.id}</td>
              <td className="px-6 py-4">{row.name}</td>
              <td className="px-6 py-4">{row.email}</td>
              <td className="px-6 py-4">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="p-4">
        <AdvancedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={tableData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemsPerPageOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
}

// Example 5: With API Data (Async)
export function AsyncPaginationExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          title: `Item ${i + 1}`,
        }));
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        {paginatedData.map(item => (
          <div key={item.id} className="p-4 border rounded mb-2">
            {item.title}
          </div>
        ))}
      </div>
      
      <AdvancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={data.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}

// Export all examples
export const PaginationExamples = {
  BasicPaginationExample,
  FilteredPaginationExample,
  MinimalPaginationExample,
  AdminTablePaginationExample,
  AsyncPaginationExample,
};
