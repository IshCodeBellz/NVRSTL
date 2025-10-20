import { hash, compare } from "bcryptjs";
import { z } from "zod";

/**
 * Password security and validation utilities
 */

export interface PasswordStrengthResult {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  isValid: boolean;
  entropy: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  prohibitCommonPasswords: boolean;
  prohibitPersonalInfo: boolean;
  maxAge?: number; // days
}

/**
 * Default password policy for the application
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  prohibitCommonPasswords: true,
  prohibitPersonalInfo: true,
  maxAge: 90, // 3 months
};

/**
 * Most common passwords to prohibit
 */
const COMMON_PASSWORDS = [
  "password",
  "123456",
  "123456789",
  "qwerty",
  "abc123",
  "password1",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "1234567890",
  "dragon",
  "sunshine",
  "iloveyou",
  "princess",
  "rockyou",
  "12345678",
  "123123",
  "football",
  "baseball",
  "welcome1",
  "access",
  "shadow",
  "master",
  "jennifer",
  "jordan",
  "superman",
  "harley",
  "1234567",
  "hunter",
  "trustno1",
  "ranger",
  "buster",
  "thomas",
  "robert",
  "soccer",
  "batman",
  "test",
  "pass",
  "killer",
  "hockey",
  "george",
  "charlie",
  "andrew",
  "michelle",
  "love",
  "sunshine",
  "jessica",
  "asshole",
  "secret",
  "fuckyou",
  "stars",
  "enter",
  "eagle",
  "nigger",
  "maggie",
  "david",
  "whatever",
  "mickey",
  "dick",
  "startrek",
];

/**
 * Password strength analyzer
 */
export class PasswordSecurity {
  /**
   * Analyze password strength
   */
  static analyzeStrength(
    password: string,
    userInfo?: {
      email?: string;
      name?: string;
    }
  ): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push("Password must be at least 8 characters long");
    } else if (password.length >= 12) {
      score += 1;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      feedback.push("Add lowercase letters");
    } else {
      score += 0.5;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push("Add uppercase letters");
    } else {
      score += 0.5;
    }

    if (!/[0-9]/.test(password)) {
      feedback.push("Add numbers");
    } else {
      score += 0.5;
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      feedback.push("Add special characters");
    } else {
      score += 0.5;
    }

    // Common password check
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      feedback.push("This password is too common");
      score = Math.max(0, score - 2);
    }

    // Personal info check
    if (userInfo) {
      const personalTerms = [
        userInfo.email?.split("@")[0],
        userInfo.name?.toLowerCase(),
        userInfo.email?.toLowerCase(),
      ].filter(Boolean);

      for (const term of personalTerms) {
        if (term && password.toLowerCase().includes(term)) {
          feedback.push("Avoid using personal information in passwords");
          score = Math.max(0, score - 1);
          break;
        }
      }
    }

    // Pattern detection
    if (/(.)\1{2,}/.test(password)) {
      feedback.push("Avoid repeating characters");
      score = Math.max(0, score - 0.5);
    }

    if (/123|abc|qwe|asd/i.test(password)) {
      feedback.push("Avoid common sequences");
      score = Math.max(0, score - 0.5);
    }

    // Calculate entropy
    const entropy = this.calculateEntropy(password);

    // Adjust score based on entropy
    if (entropy > 50) score += 1;
    if (entropy > 70) score += 0.5;

    // Final score normalization
    score = Math.min(4, Math.max(0, Math.round(score)));

    return {
      score,
      feedback,
      isValid: score >= 2 && feedback.length === 0,
      entropy,
    };
  }

  /**
   * Calculate password entropy
   */
  static calculateEntropy(password: string): number {
    const charsetSize = this.getCharsetSize(password);
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * Get character set size for entropy calculation
   */
  private static getCharsetSize(password: string): number {
    let size = 0;

    if (/[a-z]/.test(password)) size += 26; // lowercase
    if (/[A-Z]/.test(password)) size += 26; // uppercase
    if (/[0-9]/.test(password)) size += 10; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) size += 32; // symbols (estimate)

    return size;
  }

  /**
   * Validate password against policy
   */
  static validatePolicy(
    password: string,
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
    userInfo?: {
      email?: string;
      name?: string;
    }
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Length check
    if (password.length < policy.minLength) {
      errors.push(
        `Password must be at least ${policy.minLength} characters long`
      );
    }

    // Character requirements
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain lowercase letters");
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain uppercase letters");
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("Password must contain numbers");
    }

    if (policy.requireSymbols && !/[^a-zA-Z0-9]/.test(password)) {
      errors.push("Password must contain special characters");
    }

    // Common password check
    if (
      policy.prohibitCommonPasswords &&
      COMMON_PASSWORDS.includes(password.toLowerCase())
    ) {
      errors.push("This password is too common and easily guessed");
    }

    // Personal info check
    if (policy.prohibitPersonalInfo && userInfo) {
      const personalTerms = [
        userInfo.email?.split("@")[0],
        userInfo.name?.toLowerCase(),
        userInfo.email?.toLowerCase(),
      ].filter(Boolean);

      for (const term of personalTerms) {
        if (term && password.toLowerCase().includes(term)) {
          errors.push("Password cannot contain personal information");
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate secure password suggestion
   */
  static generateSecurePassword(length: number = 12): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = lowercase + uppercase + numbers + symbols;

    let password = "";

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Hash password securely
   */
  static async hashPassword(password: string): Promise<string> {
    return hash(password, 12); // Using cost factor of 12
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return compare(password, hashedPassword);
  }

  /**
   * Check if password has been compromised (placeholder for breach detection)
   */
  static async checkBreachDatabase(password: string): Promise<{
    isCompromised: boolean;
    occurrences?: number;
  }> {
    // In production, this would integrate with HaveIBeenPwned API
    // For now, just check against our common passwords list
    const isCompromised = COMMON_PASSWORDS.includes(password.toLowerCase());

    return {
      isCompromised,
      occurrences: isCompromised ? 1000 : 0, // Mock data
    };
  }
}

/**
 * Zod schema for password validation
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .refine(
    (password) => {
      const validation = PasswordSecurity.validatePolicy(password);
      return validation.isValid;
    },
    {
      message: "Password does not meet security requirements",
    }
  );

/**
 * Strong password schema with higher requirements
 */
export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .refine(
    (password) => {
      const strength = PasswordSecurity.analyzeStrength(password);
      return strength.score >= 3;
    },
    {
      message: "Password is not strong enough (requires score of 3 or higher)",
    }
  );
