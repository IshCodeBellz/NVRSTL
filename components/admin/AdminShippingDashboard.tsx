"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingUp,
  Eye,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  status: string;
  cost: number;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
  lastTrackedAt?: string;
  order: {
    id: string;
    email: string;
    status: string;
    total: number;
    customerName: string;
    createdAt: string;
  };
}

interface ShippingMetrics {
  summary: {
    totalShipments: number;
    deliveredShipments: number;
    deliveryRate: number;
    avgDeliveryTimeHours: number;
    onTimeDeliveryRate: number;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  carrierPerformance: Array<{
    carrier: string;
    totalShipments: number;
    deliveredShipments: number;
    deliveryRate: number;
    avgDeliveryTimeHours: number;
    onTimeDeliveryRate: number;
  }>;
  carrierVolume: Array<{
    carrier: string;
    shipments: number;
    totalCost: number;
  }>;
  dailyVolume: Array<{
    date: string;
    shipped: number;
    delivered: number;
  }>;
  issues: Array<{
    id: string;
    orderId: string;
    trackingNumber: string;
    carrier: string;
    status: string;
    estimatedDelivery?: string;
    createdAt: string;
    customer: {
      name: string;
      email: string;
    };
  }>;
}

export function AdminShippingDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [metrics, setMetrics] = useState<ShippingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  //s
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("");
  const [carrier, setCarrier] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchShipments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (searchQuery) params.append("search", searchQuery);
      if (status) params.append("status", status);
      if (carrier) params.append("carrier", carrier);

      const response = await fetch(`/api/admin/shipping?${params}`);
      if (!response.ok) throw new Error("Failed to fetch shipments");

      const data = await response.json();
      setShipments(data.shipments);
      setTotalPages(data.pagination.pages);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, status, carrier]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/admin/shipping/metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");

      const data = await response.json();
      setMetrics(data);
    } catch {
      // Handle error silently
    }
  };

  useEffect(() => {
    Promise.all([fetchShipments(), fetchMetrics()]);
  }, [currentPage, searchQuery, status, carrier, fetchShipments]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_tracking" }),
      });

      if (!response.ok) throw new Error("Failed to refresh tracking");

      // Refresh data
      await Promise.all([fetchShipments(), fetchMetrics()]);
    } catch {
      // Handle error silently
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: "secondary" as const, icon: Clock },
      SHIPPED: { variant: "default" as const, icon: Package },
      IN_TRANSIT: { variant: "default" as const, icon: Truck },
      OUT_FOR_DELIVERY: { variant: "default" as const, icon: MapPin },
      DELIVERED: { variant: "success" as const, icon: CheckCircle2 },
      EXCEPTION: { variant: "destructive" as const, icon: AlertTriangle },
      CANCELLED: { variant: "secondary" as const, icon: AlertTriangle },
      DELIVERY_ATTEMPTED: { variant: "warning" as const, icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "secondary" as const,
      icon: Package,
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Normalize a ratio or percentage into a clamped 0..100 percentage
  const toPercent = (value: number | undefined | null) => {
    const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
    const pct = v <= 1 ? v * 100 : v; // accept 0..1 (ratio) or 0..100 (percent)
    return Math.max(0, Math.min(100, pct));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Show setup message if no shipments exist
  if (
    !loading &&
    shipments.length === 0 &&
    (!metrics || metrics.summary.totalShipments === 0)
  ) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl">Shipping Dashboard Ready</CardTitle>
          <CardDescription>
            The shipping system is configured and ready to use. Create your
            first shipment to see data here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-2">📦 Shipment Management</h4>
              <p className="text-muted-foreground">
                Track packages, manage deliveries, and monitor carrier
                performance
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-2">📊 Analytics & Metrics</h4>
              <p className="text-muted-foreground">
                View delivery rates, performance metrics, and shipping analytics
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-2">🚨 Issue Monitoring</h4>
              <p className="text-muted-foreground">
                Get alerts for delayed deliveries and shipping exceptions
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-2">🔄 Real-time Updates</h4>
              <p className="text-muted-foreground">
                Automatic tracking updates from multiple carrier APIs
              </p>
            </div>
          </div>
          <div className="text-center pt-4">
            <Link
              href="/admin/orders"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Go to Orders → Create Shipments
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Shipments
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.summary.totalShipments.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Delivery Rate
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {toPercent(metrics.summary.deliveryRate).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.summary.deliveredShipments} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Delivery Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.summary.avgDeliveryTimeHours / 24)}d
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.summary.avgDeliveryTimeHours.toFixed(1)} hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                On-Time Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {toPercent(metrics.summary.onTimeDeliveryRate).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Within estimated time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="shipments" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          <Button
            onClick={handleRefreshAll}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh All Tracking
          </Button>
        </div>

        <TabsContent value="shipments" className="space-y-4">
          {/*s */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipment Management</CardTitle>
              <CardDescription>
                Search, filter, and manage all shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by tracking number, order ID, or customer email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">
                      Out for Delivery
                    </SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="EXCEPTION">Exception</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={carrier}
                  onValueChange={(v) => setCarrier(v === "ALL" ? "" : v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="by carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Carriers</SelectItem>
                    <SelectItem value="ROYAL_MAIL">Royal Mail</SelectItem>
                    <SelectItem value="DPD">DPD</SelectItem>
                    <SelectItem value="FEDEX">FedEx</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Shipments Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Estimated</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No shipments found
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Shipments will appear here once orders are fulfilled
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/admin/orders/${shipment.orderId}`}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              #{shipment.orderId.slice(-8)}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(shipment.order.total * 100)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {shipment.order.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {shipment.order.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm">
                              {shipment.trackingNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {shipment.service}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {shipment.carrier.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                        <TableCell>
                          {shipment.estimatedDelivery ? (
                            <p className="text-sm">
                              {formatDate(shipment.estimatedDelivery)}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(shipment.cost)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/tracking?order=${shipment.orderId}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement single refresh
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <>
              {/* Status Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipment Status Breakdown</CardTitle>
                    <CardDescription>
                      Current status distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.statusBreakdown.map((status) => (
                        <div
                          key={status.status}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusBadge(status.status)}
                          </div>
                          <span className="font-medium">{status.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Carrier Performance</CardTitle>
                    <CardDescription>
                      Delivery performance by carrier
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.carrierPerformance.map((carrier) => {
                        const pct = toPercent(carrier.deliveryRate);
                        return (
                          <div key={carrier.carrier} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {carrier.carrier.replace("_", " ")}
                              </Badge>
                              <span className="text-sm font-medium">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${pct}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {carrier.deliveredShipments} of{" "}
                              {carrier.totalShipments} delivered
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Carrier Volume */}
              <Card>
                <CardHeader>
                  <CardTitle>Carrier Volume & Costs</CardTitle>
                  <CardDescription>
                    Shipping volume and costs by carrier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {metrics.carrierVolume.map((carrier) => (
                      <div
                        key={carrier.carrier}
                        className="text-center space-y-2"
                      >
                        <Badge
                          variant="outline"
                          className="w-full justify-center"
                        >
                          {carrier.carrier.replace("_", " ")}
                        </Badge>
                        <div className="text-2xl font-bold">
                          {carrier.shipments}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(carrier.totalCost)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Delivery Issues
                </CardTitle>
                <CardDescription>
                  Recent shipments with delivery problems or delays
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.issues.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.issues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell>
                            <Link
                              href={`/admin/orders/${issue.orderId}`}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              #{issue.orderId.slice(-8)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {issue.customer.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {issue.customer.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-mono text-sm">
                              {issue.trackingNumber}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {issue.carrier.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(issue.status)}</TableCell>
                          <TableCell>
                            {issue.status === "EXCEPTION" && (
                              <Badge variant="destructive">Exception</Badge>
                            )}
                            {issue.status === "DELIVERY_ATTEMPTED" && (
                              <Badge variant="warning">
                                Delivery Attempted
                              </Badge>
                            )}
                            {issue.estimatedDelivery &&
                              new Date(issue.estimatedDelivery) < new Date() &&
                              !["DELIVERED", "CANCELLED"].includes(
                                issue.status
                              ) && <Badge variant="destructive">Overdue</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link href={`/tracking?order=${issue.orderId}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      All shipments are proceeding normally
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
