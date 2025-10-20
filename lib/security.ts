/**
 * Multi-Factor Authentication (MFA) Types and Utilities
 * Supports TOTP (Time-based One-Time Password) and SMS-based MFA
 */

import { randomBytes } from "crypto";

export enum MFAMethod {
  TOTP = "TOTP",
  SMS = "SMS",
  EMAIL = "EMAIL",
}

export enum MFAStatus {
  DISABLED = "DISABLED",
  PENDING_SETUP = "PENDING_SETUP",
  ENABLED = "ENABLED",
  SUSPENDED = "SUSPENDED",
}

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  error?: string;
  backupCodeUsed?: boolean;
}

export interface MFAConfig {
  method: MFAMethod;
  status: MFAStatus;
  secret?: string;
  phoneNumber?: string;
  email?: string;
  backupCodes?: string[];
  lastUsed?: Date;
  failedAttempts?: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  userAgent: string;
  ipAddress: string;
  location?: string;
  lastUsed: Date;
  trusted: boolean;
}

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  MFA_ENABLED = "MFA_ENABLED",
  MFA_DISABLED = "MFA_DISABLED",
  MFA_VERIFICATION_SUCCESS = "MFA_VERIFICATION_SUCCESS",
  MFA_VERIFICATION_FAILED = "MFA_VERIFICATION_FAILED",
  MFA_BACKUP_CODE_USED = "MFA_BACKUP_CODE_USED",
  DEVICE_TRUSTED = "DEVICE_TRUSTED",
  DEVICE_UNTRUSTED = "DEVICE_UNTRUSTED",
  SUSPICIOUS_LOGIN = "SUSPICIOUS_LOGIN",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type: SecurityEventType;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  riskScore?: number;
}

/**
 * Validates MFA method is supported
 */
export function isValidMFAMethod(method: string): method is MFAMethod {
  return Object.values(MFAMethod).includes(method as MFAMethod);
}

/**
 * Validates MFA status transition
 */
export function canTransitionMFAStatus(
  from: MFAStatus,
  to: MFAStatus
): boolean {
  const validTransitions: Record<MFAStatus, MFAStatus[]> = {
    [MFAStatus.DISABLED]: [MFAStatus.PENDING_SETUP],
    [MFAStatus.PENDING_SETUP]: [MFAStatus.ENABLED, MFAStatus.DISABLED],
    [MFAStatus.ENABLED]: [MFAStatus.DISABLED, MFAStatus.SUSPENDED],
    [MFAStatus.SUSPENDED]: [MFAStatus.ENABLED, MFAStatus.DISABLED],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Generates secure backup codes for MFA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate cryptographically secure 8-character backup code
    // Using randomBytes for better security than Math.random()
    const bytes = randomBytes(6);
    const code = bytes.toString("hex").substring(0, 8).toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Calculates risk score for security events
 */
export function calculateRiskScore(
  eventType: SecurityEventType,
  context: {
    isNewDevice?: boolean;
    isNewLocation?: boolean;
    failedAttempts?: number;
    timeOfDay?: "normal" | "unusual";
  }
): number {
  let baseScore = 0;

  // Base scores by event type
  switch (eventType) {
    case SecurityEventType.SUSPICIOUS_LOGIN:
      baseScore = 80;
      break;
    case SecurityEventType.MFA_VERIFICATION_FAILED:
      baseScore = 40;
      break;
    case SecurityEventType.PASSWORD_CHANGED:
      baseScore = 30;
      break;
    case SecurityEventType.MFA_BACKUP_CODE_USED:
      baseScore = 50;
      break;
    default:
      baseScore = 10;
  }

  // Risk modifiers
  if (context.isNewDevice) baseScore += 20;
  if (context.isNewLocation) baseScore += 25;
  if (context.failedAttempts && context.failedAttempts > 3) {
    baseScore += context.failedAttempts * 10;
  }
  if (context.timeOfDay === "unusual") baseScore += 15;

  return Math.min(baseScore, 100); // Cap at 100
}

/**
 * Device fingerprinting for security
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string
): string {
  // Simple fingerprint - in production, use more sophisticated methods
  const data = `${userAgent}:${ipAddress}`;
  return Buffer.from(data).toString("base64").substring(0, 16);
}
