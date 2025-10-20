import { captureException, captureMessage } from "@sentry/nextjs";

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertChannel = "email" | "slack" | "webhook" | "sentry";

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
  channels: AlertChannel[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldown: number; // minutes
  enabled: boolean;
}

class AlertManager {
  private static instance: AlertManager;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private constructor() {}

  async createAlert(
    type: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata: Record<string, unknown> = {},
    channels: AlertChannel[] = ["sentry"]
  ): Promise<string> {
    const alertId = `${type}-${Date.now()}`;

    // Check cooldown
    const cooldownKey = `${type}-${severity}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    if (lastAlert && Date.now() - lastAlert.getTime() < 5 * 60 * 1000) {
      // 5 minute cooldown
      return alertId; // Skip duplicate alerts
    }

    const alert: Alert = {
      id: alertId,
      type,
      severity,
      title,
      message,
      metadata,
      timestamp: new Date(),
      resolved: false,
      channels,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertCooldowns.set(cooldownKey, new Date());

    // Send alert through configured channels
    await this.sendAlert(alert);

    return alertId;
  }

  private async sendAlert(alert: Alert): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const channel of alert.channels) {
      switch (channel) {
        case "sentry":
          promises.push(this.sendToSentry(alert));
          break;
        case "email":
          promises.push(this.sendToEmail(alert));
          break;
        case "slack":
          promises.push(this.sendToSlack(alert));
          break;
        case "webhook":
          promises.push(this.sendToWebhook(alert));
          break;
      }
    }

    await Promise.allSettled(promises);
  }

  private async sendToSentry(alert: Alert): Promise<void> {
    try {
      if (alert.severity === "critical" || alert.severity === "high") {
        captureException(new Error(alert.message), {
          tags: {
            alert_type: alert.type,
            severity: alert.severity,
          },
          extra: {
            alert_id: alert.id,
            title: alert.title,
            metadata: alert.metadata,
          },
          level: alert.severity === "critical" ? "error" : "warning",
        });
      } else {
        captureMessage(alert.message, {
          tags: {
            alert_type: alert.type,
            severity: alert.severity,
          },
          extra: {
            alert_id: alert.id,
            title: alert.title,
            metadata: alert.metadata,
          },
          level: "info",
        });
      }
    } catch (error) {
      console.error("Failed to send alert to Sentry:", error);
    }
  }

  private async sendToEmail(alert: Alert): Promise<void> {
    try {
      // Implement email sending logic here
      // This would integrate with your email service (Resend, SendGrid, etc.)
      const emailService = await import("@/lib/server/email");

      const recipients = process.env.ADMIN_EMAIL?.split(",") || [
        "admin@example.com",
      ];

      await emailService.emailService.sendAlert(
        `[${alert.severity.toUpperCase()}] ${alert.title}`,
        `
          Alert: ${alert.title}
          Severity: ${alert.severity}
          Time: ${alert.timestamp.toISOString()}
          
          Message: ${alert.message}
          
          Metadata: ${JSON.stringify(alert.metadata, null, 2)}
          
          Alert ID: ${alert.id}
        `,
        recipients
      );
    } catch (error) {
      console.error("Failed to send alert email:", error);
    }
  }

  private async sendToSlack(alert: Alert): Promise<void> {
    try {
      if (!process.env.SLACK_WEBHOOK_URL) {
        return;
      }

      const color = {
        low: "#36a64f",
        medium: "#ff9500",
        high: "#ff4444",
        critical: "#ff0000",
      }[alert.severity];

      const payload = {
        text: `🚨 ${alert.title}`,
        attachments: [
          {
            color,
            fields: [
              {
                title: "Severity",
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: "Type",
                value: alert.type,
                short: true,
              },
              {
                title: "Message",
                value: alert.message,
                short: false,
              },
              {
                title: "Time",
                value: alert.timestamp.toISOString(),
                short: true,
              },
            ],
            footer: `Alert ID: ${alert.id}`,
          },
        ],
      };

      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send alert to Slack:", error);
    }
  }

  private async sendToWebhook(alert: Alert): Promise<void> {
    try {
      if (!process.env.ALERT_WEBHOOK_URL) {
        return;
      }

      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Alert-Source": "dy-official",
        },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error("Failed to send alert to webhook:", error);
    }
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    this.activeAlerts.set(alertId, alert);
    return true;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter((alert) => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAlertHistory(limit: number = 50): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

// Predefined alert rules for shipping system
export const SHIPPING_ALERT_RULES: AlertRule[] = [
  {
    id: "high_failure_rate",
    name: "High Shipment Failure Rate",
    condition: "failure_rate > threshold",
    threshold: 10, // 10% failure rate
    severity: "high",
    channels: ["sentry", "email"],
    cooldown: 15,
    enabled: true,
  },
  {
    id: "carrier_timeout",
    name: "Carrier API Timeout",
    condition: "api_timeout > threshold",
    threshold: 30, // 30 seconds
    severity: "medium",
    channels: ["sentry"],
    cooldown: 5,
    enabled: true,
  },
  {
    id: "webhook_failure",
    name: "Webhook Processing Failure",
    condition: "webhook_failures > threshold",
    threshold: 5, // 5 failures in window
    severity: "medium",
    channels: ["sentry", "email"],
    cooldown: 10,
    enabled: true,
  },
  {
    id: "sla_breach",
    name: "SLA Delivery Breach",
    condition: "sla_breaches > threshold",
    threshold: 20, // 20 breaches
    severity: "high",
    channels: ["email", "slack"],
    cooldown: 60,
    enabled: true,
  },
  {
    id: "database_slow_query",
    name: "Slow Database Query",
    condition: "query_time > threshold",
    threshold: 5000, // 5 seconds
    severity: "medium",
    channels: ["sentry"],
    cooldown: 5,
    enabled: true,
  },
  {
    id: "memory_usage_high",
    name: "High Memory Usage",
    condition: "memory_usage > threshold",
    threshold: 85, // 85% memory usage
    severity: "high",
    channels: ["sentry", "email"],
    cooldown: 10,
    enabled: true,
  },
];

// Convenience functions for common alerts
export const alerts = {
  createAlert: async (
    type: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata: Record<string, unknown> = {},
    channels: AlertChannel[] = ["sentry"]
  ) => {
    const alertManager = AlertManager.getInstance();
    return await alertManager.createAlert(
      type,
      severity,
      title,
      message,
      metadata,
      channels
    );
  },

  async shipmentFailed(shipmentId: string, carrier: string, error: string) {
    const alertManager = AlertManager.getInstance();
    return await alertManager.createAlert(
      "shipment_failure",
      "medium",
      "Shipment Failed",
      `Shipment ${shipmentId} failed with carrier ${carrier}: ${error}`,
      { shipmentId, carrier, error },
      ["sentry"]
    );
  },

  async carrierTimeout(carrier: string, duration: number) {
    const alertManager = AlertManager.getInstance();
    return await alertManager.createAlert(
      "carrier_timeout",
      "medium",
      "Carrier API Timeout",
      `${carrier} API timed out after ${duration}ms`,
      { carrier, duration },
      ["sentry"]
    );
  },

  async highFailureRate(carrier: string, rate: number, period: string) {
    const alertManager = AlertManager.getInstance();
    return await alertManager.createAlert(
      "high_failure_rate",
      "high",
      "High Failure Rate Detected",
      `${carrier} has ${rate}% failure rate in the last ${period}`,
      { carrier, failureRate: rate, period },
      ["sentry", "email"]
    );
  },

  async slaBreached(shipmentId: string, expectedDate: Date, actualDate: Date) {
    const alertManager = AlertManager.getInstance();
    const delay = actualDate.getTime() - expectedDate.getTime();
    const delayHours = Math.round(delay / (1000 * 60 * 60));

    return await alertManager.createAlert(
      "sla_breach",
      "medium",
      "SLA Delivery Breach",
      `Shipment ${shipmentId} delivered ${delayHours} hours late`,
      { shipmentId, expectedDate, actualDate, delayHours },
      ["email"]
    );
  },

  async webhookFailed(webhookId: string, error: string, retryCount: number) {
    const alertManager = AlertManager.getInstance();
    return await alertManager.createAlert(
      "webhook_failure",
      retryCount > 3 ? "high" : "medium",
      "Webhook Processing Failed",
      `Webhook ${webhookId} failed after ${retryCount} retries: ${error}`,
      { webhookId, error, retryCount },
      ["sentry"]
    );
  },

  async databaseSlow(query: string, duration: number) {
    const alertManager = AlertManager.getInstance();
    return await alertManager.createAlert(
      "database_slow_query",
      "medium",
      "Slow Database Query",
      `Query took ${duration}ms to execute`,
      { query, duration },
      ["sentry"]
    );
  },
};

export { AlertManager };
