"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface AnalyticsData {
  user: {
    newUsers: number;
    sessions: {
      byDevice: Record<string, number>;
      byBrowser: Record<string, number>;
      averageDuration: number;
    };
    behavior: {
      byEventType: Record<string, number>;
    };
    segments: Array<{
      name: string;
      userCount: number;
      criteria: Record<string, unknown>;
    }>;
  };
  product: {
    topViewedProducts: Array<{
      productId: string;
      productName: string;
      brandName: string;
      views: number;
      purchases: number;
      conversionRate: number;
    }>;
    topConvertingProducts: Array<{
      productId: string;
      productName: string;
      brandName: string;
      conversionRate: number;
      revenue: number;
      impressions: number;
    }>;
    topRevenueProducts: Array<{
      productId: string;
      productName: string;
      brandName: string;
      revenue: number;
      quantity: number;
    }>;
  };
  revenue: {
    dailyRevenue: Array<{
      date: string;
      revenue: number;
      orderCount: number;
    }>;
    summary: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
    };
  };
  conversion: {
    funnels: Array<{
      step: number;
      stepName: string;
      users: number;
      conversionRate: number;
      dropoffRate: number;
    }>;
    pageViews: {
      byPath: Record<string, { views: number; avgTimeOnPage: number }>;
    };
  };
  search: {
    topQueries: Array<{
      query: string;
      count: number;
      avgResults: number;
    }>;
  };
  category: {
    revenue: Array<{
      categoryId: string;
      categoryName: string;
      revenue: number;
      orderCount: number;
      productCount: number;
    }>;
  };
}

interface AnalyticsDashboardProps {
  initialData?: AnalyticsData;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
];

export default function AnalyticsDashboard({
  initialData,
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    async (includeRealtime = false) => {
      try {
        setRefreshing(true);
        setError(null);

        const response = await fetch(
          `/api/analytics?period=${period}&realtime=${includeRealtime}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.statusText}`);
        }

        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, setData, setLoading, setRefreshing, setError]
  );

  useEffect(() => {
    if (!initialData) {
      fetchAnalytics();
    }
  }, [period, initialData, fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat().format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="mb-4">Error loading analytics: {error}</p>
            <Button onClick={() => fetchAnalytics()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">
            No analytics data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive business insights and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.revenue.summary.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.revenue.summary.totalOrders)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.revenue.summary.averageOrderValue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Users</p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.user.newUsers)}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.revenue.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic by Device</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.user.sessions.byDevice).map(
                        ([device, count]) => ({
                          name: device,
                          value: count,
                        })
                      )}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                    >
                      {Object.entries(data.user.sessions.byDevice).map(
                        (_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.product.topViewedProducts
                  .slice(0, 5)
                  .map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-gray-600">
                            {product.brandName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatNumber(product.views)} views
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatPercentage(product.conversionRate)} conversion
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Daily Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue & Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={data.revenue.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="revenue" orientation="left" />
                    <YAxis yAxisId="orders" orientation="right" />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue"
                          ? formatCurrency(Number(value))
                          : formatNumber(Number(value)),
                        name === "revenue" ? "Revenue" : "Orders",
                      ]}
                    />
                    <Legend />
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                    />
                    <Bar yAxisId="orders" dataKey="orderCount" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Revenue Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.product.topRevenueProducts
                    .slice(0, 10)
                    .map((product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-gray-600">
                              {product.brandName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(product.revenue)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {product.quantity} sold
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Converting Products */}
            <Card>
              <CardHeader>
                <CardTitle>Best Converting Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.product.topConvertingProducts
                    .slice(0, 10)
                    .map((product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-gray-600">
                              {product.brandName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatPercentage(product.conversionRate)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatNumber(product.impressions)} views
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Behavior */}
            <Card>
              <CardHeader>
                <CardTitle>User Behavior Events</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(data.user.behavior.byEventType).map(
                      ([event, count]) => ({
                        event: event.replace("_", " "),
                        count,
                      })
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="event" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.user.segments.map((segment) => (
                    <div
                      key={segment.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{segment.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatNumber(segment.userCount)} users
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.conversion.funnels.map((step) => (
                    <div
                      key={step.step}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge>{step.step}</Badge>
                        <span className="font-medium">{step.stepName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{formatNumber(step.users)} users</span>
                        <Badge
                          variant={
                            step.conversionRate > 50 ? "default" : "secondary"
                          }
                        >
                          {formatPercentage(step.conversionRate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Pages */}
            <Card>
              <CardHeader>
                <CardTitle>Most Visited Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.conversion.pageViews.byPath)
                    .sort(([, a], [, b]) => b.views - a.views)
                    .slice(0, 10)
                    .map(([path, stats]) => (
                      <div
                        key={path}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-sm">{path}</span>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatNumber(stats.views)} views
                          </p>
                          <p className="text-sm text-gray-600">
                            {stats.avgTimeOnPage.toFixed(1)}s avg
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={data.category.revenue
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10)}
                  layout="horizontal"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="categoryName" type="category" width={100} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
