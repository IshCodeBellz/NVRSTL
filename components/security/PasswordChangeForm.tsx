"use client";

import { useState } from "react";
import { Eye, EyeOff, Key, Save, AlertCircle, CheckCircle } from "lucide-react";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { PasswordRequirements } from "./PasswordRequirements";
import { useToast } from "@/components/providers/ToastProvider";

interface PasswordChangeFormProps {
  className?: string;
  onSuccess?: () => void;
  requireCurrentPassword?: boolean;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  className = "",
  onSuccess,
  requireCurrentPassword = true,
}) => {
  const [formData, setFormData] = useState<FormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const { push } = useToast();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Current password validation
    if (requireCurrentPassword && !formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    // New password validation
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      // Basic validation (more detailed validation in PasswordRequirements)
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = "Password must be at least 8 characters";
      }
      if (
        requireCurrentPassword &&
        formData.newPassword === formData.currentPassword
      ) {
        newErrors.newPassword =
          "New password must be different from current password";
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: requireCurrentPassword
            ? formData.currentPassword
            : undefined,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.field) {
          setErrors({ [result.field]: result.message });
        } else {
          setErrors({ general: result.message || "Failed to change password" });
        }
        return;
      }

      // Success
      push({
        message: "Password changed successfully!",
        type: "success",
      });

      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      onSuccess?.();
    } catch (error) {
      
      
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Show requirements when user starts typing new password
    if (field === "newPassword" && value) {
      setShowRequirements(true);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const getInputClassName = (field: keyof FormErrors) => {
    const baseClasses =
      "block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-white";

    if (errors[field]) {
      return `${baseClasses} border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500`;
    }

    return `${baseClasses} border-neutral-300 dark:border-neutral-600 focus:border-blue-500`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Change Password
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Update your password to keep your account secure
          </p>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300">
              {errors.general}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        {requireCurrentPassword && (
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) =>
                  handleInputChange("currentPassword", e.target.value)
                }
                className={getInputClassName("currentPassword")}
                placeholder="Enter your current password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                disabled={isLoading}
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.currentPassword}
              </p>
            )}
          </div>
        )}

        {/* New Password */}
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPasswords.new ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              className={getInputClassName("newPassword")}
              placeholder="Enter your new password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("new")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              disabled={isLoading}
            >
              {showPasswords.new ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.newPassword}
            </p>
          )}
        </div>

        {/* Password Strength Indicator */}
        {formData.newPassword && (
          <PasswordStrengthIndicator
            password={formData.newPassword}
            className="mt-2"
            showCriteria={false}
          />
        )}

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showPasswords.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              className={getInputClassName("confirmPassword")}
              placeholder="Confirm your new password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirm")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              disabled={isLoading}
            >
              {showPasswords.confirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.confirmPassword}
            </p>
          )}

          {/* Password Match Indicator */}
          {formData.newPassword && formData.confirmPassword && (
            <div className="mt-1 flex items-center space-x-1">
              {formData.newPassword === formData.confirmPassword ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Passwords match
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Passwords do not match
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Changing Password...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Change Password
              </>
            )}
          </button>
        </div>
      </form>

      {/* Password Requirements */}
      {showRequirements && formData.newPassword && (
        <div className="mt-6 border-t dark:border-neutral-700 pt-6">
          <PasswordRequirements
            password={formData.newPassword}
            variant="detailed"
            showDescription={false}
          />
        </div>
      )}
    </div>
  );
};
