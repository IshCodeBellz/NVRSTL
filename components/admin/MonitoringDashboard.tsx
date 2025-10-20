"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  AlertCircle,
} from "lucide-react";

interface ShippingMetrics {
  overview: {
    total_shipments: number;
    active_shipments: number;
    delivered_shipments: number;
    failed_shipments: number;
    pending_shipments: number;
  };
  carrier_performance: Array<{
    carrier: string;
    total_shipments: number;
    success_rate: number;
    avg_delivery_time_hours: number | null;
    failed_shipments: number;
  }>;
  recent_failures: Array<{
    id: string;
    tracking_number: string;
    carrier: string;
    status: string;
    error_message: string | null;
    created_at: string;
    order_id: string;
  }>;
  delivery_performance: {
    on_time_delivery_rate: number;
    avg_delivery_time_hours: number | null;
    sla_breaches: number;
  };
  webhook_health: {
    total_received: number;
    failed_processing: number;
    success_rate: number;
    last_24h: number;
  };
  alerts: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    count: number;
    first_seen: string;
  }>;
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: Array<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    error?: string;
    metadata?: Record<string, unknown>;
  }>;
  uptime: number;
}

const MonitoringDashboard: React.FC = () => {
  const [shippingMetrics, setShippingMetrics] =
    useState<ShippingMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const [shippingResponse, healthResponse] = await Promise.all([
        fetch("/api/admin/monitoring/shipping"),
        fetch("/api/health"),
      ]);

      if (!shippingResponse.ok || !healthResponse.ok) {
        throw new Error("Failed to fetch monitoring data");
      }

      const [shippingData, healthData] = await Promise.all([
        shippingResponse.json(),
        healthResponse.json(),
      ]);

      setShippingMetrics(shippingData);
      setSystemHealth(healthData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "degraded":
        return "text-yellow-600";
      case "unhealthy":
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "unhealthy":
      case "critical":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };

    return (
      <Badge
        className={variants[severity as keyof typeof variants] || variants.low}
      >
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span>Error loading monitoring data: {error}</span>
          </div>
          <Button onClick={fetchMetrics} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Monitoring Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50" : ""}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button onClick={fetchMetrics}>Refresh Now</Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(systemHealth.overall)}
              <span>System Health</span>
              <Badge className={getStatusColor(systemHealth.overall)}>
                {systemHealth.overall.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemHealth.services.map((service) => (
                <div
                  key={service.service}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(service.status)}
                    <span className="font-medium">
                      {service.service.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {service.responseTime}ms
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Last updated: {new Date(systemHealth.timestamp).toLocaleString()}{" "}
              | Uptime: {Math.round(systemHealth.uptime / 60)} minutes
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="carriers">Carriers</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {shippingMetrics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Package className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {shippingMetrics.overview.total_shipments}
                        </p>
                        <p className="text-sm text-gray-600">Total Shipments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {shippingMetrics.overview.active_shipments}
                        </p>
                        <p className="text-sm text-gray-600">
                          Active Shipments
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {shippingMetrics.overview.delivered_shipments}
                        </p>
                        <p className="text-sm text-gray-600">Delivered</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {shippingMetrics.overview.failed_shipments}
                        </p>
                        <p className="text-sm text-gray-600">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {shippingMetrics.overview.pending_shipments}
                        </p>
                        <p className="text-sm text-gray-600">Pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Delivery Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {shippingMetrics.delivery_performance.on_time_delivery_rate.toFixed(
                          1
                        )}
                        %
                      </p>
                      <p className="text-sm text-gray-600">
                        On-time Delivery Rate
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">
                        {shippingMetrics.delivery_performance.avg_delivery_time_hours?.toFixed(
                          1
                        ) || "N/A"}
                        h
                      </p>
                      <p className="text-sm text-gray-600">Avg Delivery Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">
                        {shippingMetrics.delivery_performance.sla_breaches}
                      </p>
                      <p className="text-sm text-gray-600">SLA Breaches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="space-y-4">
          {shippingMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Carrier Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shippingMetrics.carrier_performance.map((carrier) => (
                    <div
                      key={carrier.carrier}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">
                          {carrier.carrier}
                        </h3>
                        <Badge
                          className={
                            carrier.success_rate >= 95
                              ? "bg-green-100 text-green-800"
                              : carrier.success_rate >= 85
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {carrier.success_rate.toFixed(1)}% Success Rate
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Shipments
                          </p>
                          <p className="font-semibold">
                            {carrier.total_shipments}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Failed Shipments
                          </p>
                          <p className="font-semibold text-red-600">
                            {carrier.failed_shipments}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Avg Delivery Time
                          </p>
                          <p className="font-semibold">
                            {carrier.avg_delivery_time_hours?.toFixed(1) ||
                              "N/A"}
                            h
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Success Rate</p>
                          <p className="font-semibold">
                            {carrier.success_rate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {shippingMetrics && (
            <>
              {/* Active Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Active Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingMetrics.alerts.length > 0 ? (
                    <div className="space-y-3">
                      {shippingMetrics.alerts.map((alert, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              {getSeverityBadge(alert.severity)}
                              <span className="font-medium">
                                {alert.type.replace("_", " ")}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              Count: {alert.count}
                            </span>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            First seen:{" "}
                            {new Date(alert.first_seen).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                      <p>No active alerts - all systems operating normally</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Failures */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Shipment Failures</CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingMetrics.recent_failures.length > 0 ? (
                    <div className="space-y-3">
                      {shippingMetrics.recent_failures
                        .slice(0, 10)
                        .map((failure) => (
                          <div
                            key={failure.id}
                            className="border rounded-lg p-3"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">
                                  {failure.tracking_number} ({failure.carrier})
                                </p>
                                <p className="text-sm text-gray-600">
                                  Order: {failure.order_id}
                                </p>
                                {failure.error_message && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {failure.error_message}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant="destructive">
                                  {failure.status}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(
                                    failure.created_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                      <p>No recent failures</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {shippingMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Webhook Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {shippingMetrics.webhook_health.total_received}
                    </p>
                    <p className="text-sm text-gray-600">Total Received</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {shippingMetrics.webhook_health.failed_processing}
                    </p>
                    <p className="text-sm text-gray-600">Failed Processing</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {shippingMetrics.webhook_health.success_rate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {shippingMetrics.webhook_health.last_24h}
                    </p>
                    <p className="text-sm text-gray-600">Last 24h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;
