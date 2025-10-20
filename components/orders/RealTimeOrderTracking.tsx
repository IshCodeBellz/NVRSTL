"use client";

import { useOrderUpdates } from "@/lib/client/useRealTime";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Package, Truck, CheckCircle, AlertCircle } from "lucide-react";

interface OrderTrackingProps {
  orderId: string;
  initialStatus?: string;
}

const statusIcons = {
  PENDING: Clock,
  AWAITING_PAYMENT: AlertCircle,
  PAID: CheckCircle,
  FULFILLING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: AlertCircle,
  REFUNDED: AlertCircle,
};

const statusColors = {
  PENDING: "secondary",
  AWAITING_PAYMENT: "destructive",
  PAID: "default",
  FULFILLING: "secondary",
  SHIPPED: "secondary",
  DELIVERED: "default",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
} as const;

export function RealTimeOrderTracking({
  orderId,
  initialStatus,
}: OrderTrackingProps) {
  const { orderUpdates, isConnected, error } = useOrderUpdates(orderId);

  const latestUpdate = orderUpdates[orderUpdates.length - 1];
  const currentStatus =
    (latestUpdate?.payload?.orderStatus as string) || initialStatus;

  const StatusIcon =
    statusIcons[currentStatus as keyof typeof statusIcons] || Clock;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Order Tracking
            {isConnected && (
              <Badge
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700"
              >
                Live
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Real-time updates for order #{orderId}
            {error && (
              <span className="text-destructive ml-2">(Connection error)</span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Status:</span>
              <Badge
                variant={
                  statusColors[currentStatus as keyof typeof statusColors] ||
                  "default"
                }
                className="ml-2"
              >
                {(currentStatus as string)?.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {orderUpdates.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recent Updates:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {orderUpdates
                  .slice()
                  .reverse()
                  .map((update, index) => {
                    const toStatus = update.payload?.toStatus as string;
                    const reason = update.payload?.reason as string;
                    const UpdateIcon =
                      statusIcons[toStatus as keyof typeof statusIcons] ||
                      Clock;

                    return (
                      <div
                        key={`${update.timestamp}-${index}`}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <UpdateIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              Status changed to: {toStatus?.replace("_", " ")}
                            </span>
                            <Badge
                              variant={
                                statusColors[
                                  toStatus as keyof typeof statusColors
                                ] || "default"
                              }
                            >
                              {toStatus}
                            </Badge>
                          </div>

                          {reason && (
                            <p className="text-sm text-muted-foreground">
                              Reason: {reason}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            {new Date(update.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {orderUpdates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent updates. Waiting for status changes...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
