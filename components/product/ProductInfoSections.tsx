"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ProductInfoSectionsProps {
  description: string;
}

export function ProductInfoSections({ description }: ProductInfoSectionsProps) {
  const [expandedSections, setExpandedSections] = useState<{
    productInfo: boolean;
    shipping: boolean;
    returns: boolean;
  }>({
    productInfo: false,
    shipping: false,
    returns: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-0 border-t border-gray-200 pt-6">
      {/* PRODUCT INFO Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("productInfo")}
          className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-bold text-sm uppercase tracking-wide text-black">
            PRODUCT INFO
          </span>
          {expandedSections.productInfo ? (
            <ChevronUp className="w-5 h-5 text-black" />
          ) : (
            <ChevronDown className="w-5 h-5 text-black" />
          )}
        </button>
        {expandedSections.productInfo && (
          <div className="pb-4 pr-8">
            <div className="text-sm text-gray-700 leading-relaxed">
              {description}
            </div>
          </div>
        )}
      </div>

      {/* SHIPPING TIMES & COSTS Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("shipping")}
          className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-bold text-sm uppercase tracking-wide text-black">
            SHIPPING TIMES & COSTS
          </span>
          {expandedSections.shipping ? (
            <ChevronUp className="w-5 h-5 text-black" />
          ) : (
            <ChevronDown className="w-5 h-5 text-black" />
          )}
        </button>
        {expandedSections.shipping && (
          <div className="pb-4 pr-8">
            <div className="text-sm text-gray-700 leading-relaxed space-y-2">
              <p>
                <strong>Standard Delivery:</strong> 3-5 business days - FREE on
                orders over £50
              </p>
              <p>
                <strong>Express Delivery:</strong> 1-2 business days - £9.99
              </p>
              <p>
                <strong>Next Day Delivery:</strong> Order before 2pm - £14.99
              </p>
              <p>
                <strong>International:</strong> 5-10 business days - £19.99
              </p>
              <p className="text-xs text-gray-500 mt-3">
                *Delivery times may vary during peak periods and holidays
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RETURNS POLICY Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("returns")}
          className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-bold text-sm uppercase tracking-wide text-black">
            RETURNS POLICY
          </span>
          {expandedSections.returns ? (
            <ChevronUp className="w-5 h-5 text-black" />
          ) : (
            <ChevronDown className="w-5 h-5 text-black" />
          )}
        </button>
        {expandedSections.returns && (
          <div className="pb-4 pr-8">
            <div className="text-sm text-gray-700 leading-relaxed space-y-2">
              <p>
                <strong>100 Day Returns:</strong> Return any item within 100
                days of purchase for a full refund
              </p>
              <p>
                <strong>Free Returns:</strong> We provide a prepaid return label
                for your convenience
              </p>
              <p>
                <strong>Condition:</strong> Items must be unworn, with original
                tags and packaging
              </p>
              <p>
                <strong>Refund Processing:</strong> Refunds processed within 3-5
                business days of receiving your return
              </p>
              <p className="text-xs text-gray-500 mt-3">
                *Customized items (jerseys with names/numbers) are final sale
                and cannot be returned
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
