"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Mail,
  Smartphone,
  MessageSquare,
  Package,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type:
    | "ORDER_CONFIRMATION"
    | "ORDER_SHIPPED"
    | "PAYMENT_FAILED"
    | "ORDER_CANCELLED"
    | "ADMIN_ALERT";
  userId?: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
  channels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  deliveryStatus: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "CANCELLED";
}

interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  byType: Record<string, number>;
  last24Hours: number;
}

interface SystemHealth {
  emailService: "HEALTHY" | "WARNING" | "ERROR";
  smsService: "HEALTHY" | "WARNING" | "ERROR";
  lastNotificationSent: string | null;
  failureRate: number;
  averageDeliveryTime: number;
}

export function AdminNotificationDashboard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "failed">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);

      // Fetch notifications
      const notificationsRes = await fetch("/api/admin/notifications");
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.notifications || []);
      }

      // Fetch stats
      const statsRes = await fetch("/api/admin/notifications/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch health
      const healthRes = await fetch("/api/admin/notifications/health");
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ORDER_CONFIRMATION":
        return <Package className="h-4 w-4" />;
      case "ORDER_SHIPPED":
        return <Package className="h-4 w-4" />;
      case "PAYMENT_FAILED":
        return <CreditCard className="h-4 w-4" />;
      case "ORDER_CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "ADMIN_ALERT":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
      case "DELIVERED":
        return "success";
      case "PENDING":
        return "warning";
      case "FAILED":
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "text-green-600";
      case "WARNING":
        return "text-yellow-600";
      case "ERROR":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <CheckCircle2 className="h-4 w-4" />;
      case "WARNING":
        return <AlertCircle className="h-4 w-4" />;
      case "ERROR":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "pending") return notification.deliveryStatus === "PENDING";
    if (filter === "failed") return notification.deliveryStatus === "FAILED";
    return true;
  });

  const retryNotification = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/admin/notifications/${notificationId}/retry`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        await fetchData(); // Refresh data
      }
    } catch (error) {
      
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Notification Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor customer notifications and system health
          </p>
        </div>
        <Button
          onClick={fetchData}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* System Health */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">Email Service:</span>
                <div
                  className={`flex items-center space-x-1 ${getHealthColor(
                    health.emailService
                  )}`}
                >
                  {getHealthIcon(health.emailService)}
                  <span className="text-sm">{health.emailService}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">SMS Service:</span>
                <div
                  className={`flex items-center space-x-1 ${getHealthColor(
                    health.smsService
                  )}`}
                >
                  {getHealthIcon(health.smsService)}
                  <span className="text-sm">{health.smsService}</span>
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">Failure Rate:</span>
                <span
                  className={`ml-1 ${
                    health.failureRate > 10 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {health.failureRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Avg Delivery:</span>
                <span className="ml-1">
                  {health.averageDeliveryTime.toFixed(1)}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Sent
                  </p>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Failed
                  </p>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last 24h
                  </p>
                  <p className="text-2xl font-bold">{stats.last24Hours}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            Monitor and manage customer notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Buttons */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={filter === "failed" ? "default" : "outline"}
                onClick={() => setFilter("failed")}
              >
                Failed
              </Button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto pr-4 space-y-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No notifications found
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(notification.type)}
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          getStatusColor(notification.deliveryStatus) as
                            | "default"
                            | "secondary"
                            | "destructive"
                            | "outline"
                        }
                      >
                        {notification.deliveryStatus}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span>Order: {notification.orderId || "N/A"}</span>
                        <span>
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        <div className="flex items-center space-x-1">
                          {notification.channels.email && (
                            <Mail className="h-3 w-3" />
                          )}
                          {notification.channels.sms && (
                            <Smartphone className="h-3 w-3" />
                          )}
                          {notification.channels.inApp && (
                            <MessageSquare className="h-3 w-3" />
                          )}
                        </div>
                      </div>

                      {notification.deliveryStatus === "FAILED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryNotification(notification.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
