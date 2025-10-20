"use client";

import { useState, useEffect } from "react";

interface DemoData {
  sampleQuery?: string;
  results?: number;
  avgResponseTime?: string;
  filterOptions?: string[];
  [key: string]: unknown;
}

interface AnalyticsData {
  // Inventory health specific
  totalProducts?: string | number;
  healthScore?: string | number;

  // Search performance specific
  suggestionsAvailable?: string | number;
  trendingQueriesTracked?: string | number;

  // Personalization metrics specific
  strategiesImplemented?: string | number;
  recommendationConfidence?: string | number;

  // Common fields
  totalItems?: number;
  lowStock?: number;
  outOfStock?: number;
  lastUpdated?: string;
  searchVolume?: number;
  clickThrough?: string;
  conversionRate?: string;
  personalizedViews?: number;
  recommendationAccuracy?: string;
  [key: string]: unknown;
}

interface Phase3DemoData {
  phase: string;
  status: string;
  timestamp: string;
  features: {
    advancedSearch: {
      status: string;
      capabilities: string[];
      demo: DemoData;
    };
    personalization: {
      status: string;
      capabilities: string[];
      demo: DemoData;
    };
    inventoryManagement: {
      status: string;
      capabilities: string[];
      demo: DemoData;
    };
    productManagement: {
      status: string;
      capabilities: string[];
      demo: DemoData;
    };
  };
  analytics: {
    inventoryHealth: AnalyticsData;
    searchPerformance: AnalyticsData;
    personalizationMetrics: AnalyticsData;
  };
  nextSteps: string[];
}

export default function Phase3Dashboard() {
  const [demoData, setDemoData] = useState<Phase3DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPhase3Demo();
  }, []);

  const fetchPhase3Demo = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dev/phase3-demo");
      const result = await response.json();

      if (result.success) {
        setDemoData(result.data);
      } else {
        setError(result.error || "Failed to load Phase 3 demo");
      }
    } catch (error) {
      
      setError("Network error loading Phase 3 demo");
      
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading Phase 3 Demo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Demo Load Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPhase3Demo}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!demoData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {demoData.phase}
              </h1>
              <p className="text-lg text-green-600 font-semibold mt-1">
                {demoData.status}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(demoData.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-2">🚀</div>
              <button
                onClick={fetchPhase3Demo}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Refresh Demo
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {Object.entries(demoData.features).map(([key, feature]) => (
            <div key={key} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </h3>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {feature.status}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">
                  Capabilities:
                </h4>
                <ul className="space-y-1">
                  {feature.capabilities.map((capability, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-center"
                    >
                      <span className="text-green-500 mr-2">✓</span>
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">
                  Demo Results:
                </h4>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(feature.demo, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Analytics Dashboard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">
                Inventory Health
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Products:</span>
                  <span className="font-semibold">
                    {demoData.analytics.inventoryHealth.totalProducts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Health Score:</span>
                  <span className="font-semibold text-green-600">
                    {demoData.analytics.inventoryHealth.healthScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Low Stock:</span>
                  <span className="font-semibold text-orange-600">
                    {demoData.analytics.inventoryHealth.lowStock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Out of Stock:</span>
                  <span className="font-semibold text-red-600">
                    {demoData.analytics.inventoryHealth.outOfStock}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-3">
                Search Performance
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">Suggestions:</span>
                  <span className="font-semibold">
                    {demoData.analytics.searchPerformance.suggestionsAvailable}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Trending Queries:</span>
                  <span className="font-semibold">
                    {
                      demoData.analytics.searchPerformance
                        .trendingQueriesTracked
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Faceted Filtering:</span>
                  <span className="font-semibold text-green-600">✓ Active</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-3">
                Personalization
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-purple-700">Strategies:</span>
                  <span className="font-semibold">
                    {
                      demoData.analytics.personalizationMetrics
                        .strategiesImplemented
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Confidence:</span>
                  <span className="font-semibold text-green-600">
                    {
                      demoData.analytics.personalizationMetrics
                        .recommendationConfidence
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Behavior Tracking:</span>
                  <span className="font-semibold text-green-600">✓ Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Next Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoData.nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-center p-3 bg-gray-50 rounded-lg"
              >
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3">
                  {index + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
