import * as speakeasy from "speakeasy";
import { prisma } from "./prisma";
import {
  MFAMethod,
  MFAStatus,
  MFASetupResult,
  MFAVerificationResult,
  generateBackupCodes,
} from "../security";
import { CMSService } from "./cmsService";

export class MFAService {
  /**
   * Setup TOTP MFA for a user
   */
  static async setupTOTP(
    userId: string,
    customAppName?: string
  ): Promise<MFASetupResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get site name from CMS settings or use default
    let appName = customAppName;
    if (!appName) {
      try {
        const settings = await CMSService.getSiteSettings();
        appName = (settings.siteName as string) || "DY OFFICIALETTE";
      } catch (_error) {
        console.warn("Could not load site name from CMS, using default");
        appName = "DY OFFICIALETTE";
      }
    }

    // Generate secret with proper naming format for authenticator apps
    // Format: "Site Name (user@email.com)" - this shows both site and email
    const secret = speakeasy.generateSecret({
      name: `${appName} (${user.email})`,
      issuer: appName,
    });

    // Store the TOTP URL for QRCodeSVG component
    const totpUrl = secret.otpauth_url!;

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store in database
    await prisma.mfaDevice.upsert({
      where: {
        userId_method: {
          userId,
          method: MFAMethod.TOTP,
        },
      },
      create: {
        userId,
        method: MFAMethod.TOTP,
        status: MFAStatus.PENDING_SETUP,
        secret: secret.base32,
        backupCodes: JSON.stringify(backupCodes),
      },
      update: {
        secret: secret.base32,
        backupCodes: JSON.stringify(backupCodes),
        status: MFAStatus.PENDING_SETUP,
        failedAttempts: 0,
      },
    });

    return {
      secret: secret.base32!,
      qrCodeUrl: totpUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token and complete MFA setup
   */
  static async verifyAndEnableTOTP(
    userId: string,
    token: string
  ): Promise<MFAVerificationResult> {
    console.log("MFA Service - Looking for pending setup for user:", userId);

    const mfaDevice = await prisma.mfaDevice.findFirst({
      where: {
        userId,
        method: MFAMethod.TOTP,
        status: MFAStatus.PENDING_SETUP,
      },
    });

    console.log("MFA Device found:", mfaDevice);

    if (!mfaDevice || !mfaDevice.secret) {
      return {
        success: false,
        error: "MFA setup not found or already completed",
      };
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: mfaDevice.secret,
      encoding: "base32",
      token,
      window: 2, // Allow 2 steps before/after current time
    });

    console.log("Token verification result:", verified);

    if (!verified) {
      // Increment failed attempts
      await prisma.mfaDevice.update({
        where: { id: mfaDevice.id },
        data: {
          failedAttempts: { increment: 1 },
        },
      });

      return { success: false, error: "Invalid verification code" };
    }

    // Enable MFA
    await prisma.$transaction([
      // Update MFA device status
      prisma.mfaDevice.update({
        where: { id: mfaDevice.id },
        data: {
          status: MFAStatus.ENABLED,
          lastUsed: new Date(),
          failedAttempts: 0,
        },
      }),
      // Update user MFA status
      prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      }),
    ]);

    return { success: true };
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMFA(
    userId: string,
    token: string
  ): Promise<MFAVerificationResult> {
    const mfaDevice = await prisma.mfaDevice.findFirst({
      where: {
        userId,
        method: MFAMethod.TOTP,
        status: MFAStatus.ENABLED,
      },
    });

    if (!mfaDevice || !mfaDevice.secret) {
      return { success: false, error: "MFA not enabled for this user" };
    }

    // Check if device is suspended due to too many failed attempts
    if (mfaDevice.failedAttempts >= 5) {
      return {
        success: false,
        error: "MFA temporarily suspended due to too many failed attempts",
      };
    }

    // First check if it's a backup code
    if (mfaDevice.backupCodes) {
      const backupCodes = JSON.parse(mfaDevice.backupCodes) as string[];
      const codeIndex = backupCodes.findIndex(
        (code) => code === token.toUpperCase()
      );

      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);

        await prisma.mfaDevice.update({
          where: { id: mfaDevice.id },
          data: {
            backupCodes: JSON.stringify(backupCodes),
            lastUsed: new Date(),
            failedAttempts: 0,
          },
        });

        return { success: true, backupCodeUsed: true };
      }
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: mfaDevice.secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (!verified) {
      // Increment failed attempts
      const updatedDevice = await prisma.mfaDevice.update({
        where: { id: mfaDevice.id },
        data: {
          failedAttempts: { increment: 1 },
        },
      });

      // Suspend if too many failed attempts
      if (updatedDevice.failedAttempts >= 5) {
        await prisma.mfaDevice.update({
          where: { id: mfaDevice.id },
          data: { status: MFAStatus.SUSPENDED },
        });
      }

      return { success: false, error: "Invalid verification code" };
    }

    // Update last used and reset failed attempts
    await prisma.mfaDevice.update({
      where: { id: mfaDevice.id },
      data: {
        lastUsed: new Date(),
        failedAttempts: 0,
      },
    });

    return { success: true };
  }

  /**
   * Disable MFA for a user
   */
  static async disableMFA(userId: string): Promise<void> {
    await prisma.$transaction([
      // Update all MFA devices
      prisma.mfaDevice.updateMany({
        where: { userId },
        data: { status: MFAStatus.DISABLED },
      }),
      // Update user MFA status
      prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false },
      }),
    ]);
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const mfaDevice = await prisma.mfaDevice.findFirst({
      where: {
        userId,
        method: MFAMethod.TOTP,
        status: MFAStatus.ENABLED,
      },
    });

    if (!mfaDevice) {
      throw new Error("MFA not enabled for this user");
    }

    const newBackupCodes = generateBackupCodes();

    await prisma.mfaDevice.update({
      where: { id: mfaDevice.id },
      data: {
        backupCodes: JSON.stringify(newBackupCodes),
      },
    });

    return newBackupCodes;
  }

  /**
   * Get MFA status for a user
   */
  static async getMFAStatus(userId: string) {
    const mfaDevice = await prisma.mfaDevice.findFirst({
      where: { userId, method: MFAMethod.TOTP },
      select: {
        status: true,
        lastUsed: true,
        failedAttempts: true,
        backupCodes: true,
      },
    });

    if (!mfaDevice) {
      return { enabled: false, status: MFAStatus.DISABLED };
    }

    const backupCodes = mfaDevice.backupCodes
      ? (JSON.parse(mfaDevice.backupCodes) as string[])
      : [];

    return {
      enabled: mfaDevice.status === MFAStatus.ENABLED,
      status: mfaDevice.status,
      lastUsed: mfaDevice.lastUsed,
      failedAttempts: mfaDevice.failedAttempts,
      backupCodesRemaining: backupCodes.length,
      suspended: mfaDevice.status === MFAStatus.SUSPENDED,
    };
  }
}
