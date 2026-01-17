
"use client";

import { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import axios from "axios";

interface MultiSelectProps {
  apiUrl: string;
  selectedItems: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  itemLabelKey?: string;
}

const MultiSelect = ({
  apiUrl,
  selectedItems,
  onChange,
  placeholder = "Select items",
  itemLabelKey = "name",
}: MultiSelectProps) => {
  const [items, setItems] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const response = await axios.get(apiUrl);
        if (response.data.success) {
            if(response.data.categories)
          setItems(response.data.categories);
        if(response.data.groceries)
            setItems(response.data.groceries);
        }
      } catch (error) {
        console.error("Failed to fetch items:", error);
      }
      setLoading(false);
    };
    fetchItems();
  }, [apiUrl]);

  const toggleSelect = (item: any) => {
    if (selectedItems.includes(item._id)) {
      onChange(selectedItems.filter((id) => id !== item._id));
    } else {
      onChange([...selectedItems, item._id]);
    }
  };

  const getSelectedItemLabels = () => {
    return items
      .filter((item) => selectedItems.includes(item._id))
      .map((item) => item[itemLabelKey])
      .join(", ");
  };

  return (
    
    <div className="relative w-full">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 flex justify-between items-center"
          >
            <span className="truncate">
              {selectedItems.length > 0
                ? getSelectedItemLabels()
                : placeholder}
            </span>
            <ChevronDown size={20} />
          </button>
    
          {isOpen && (
            <div className="absolute top-full left-0 w-full bg-white border mt-1 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-2 text-center">Loading...</div>
              ) : (
                <ul className="">
                  {items.map((item) => (
                    <li
                      key={item._id}
                      onClick={() => toggleSelect(item)}
                      className={`p-2 cursor-pointer hover:bg-gray-100 flex items-center ${selectedItems.includes(item._id) ? "bg-green-100" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        readOnly
                        className="mr-2"
                      />
                      {item[itemLabelKey]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
    
  );
};

export default MultiSelect;
