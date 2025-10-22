"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, text: "", color: "" };

    let score = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push("at least 8 characters");

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("lowercase letters");

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("uppercase letters");

    // Number check
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push("numbers");

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push("special characters");

    const strengthLevels = [
      { score: 0, text: "", color: "" },
      { score: 1, text: "Very Weak", color: "text-red-500" },
      { score: 2, text: "Weak", color: "text-orange-500" },
      { score: 3, text: "Fair", color: "text-yellow-500" },
      { score: 4, text: "Good", color: "text-blue-500" },
      { score: 5, text: "Strong", color: "text-green-500" },
    ];

    return {
      score,
      text: strengthLevels[score].text,
      color: strengthLevels[score].color,
      feedback:
        feedback.length > 0
          ? `Consider adding: ${feedback.join(", ")}`
          : "Great password!",
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

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

    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setErrors({});
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || "Failed to update password" });
      }
    } catch {
      setErrors({ submit: "Failed to update password. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">
        Change Password
      </h1>

      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation showBackToAccount={true} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Password Updated Successfully
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Your password has been updated. Please use your new password
                    for future logins.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Password Update Failed
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {errors.submit}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Form */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Update Your Password
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Choose a strong password to keep your account secure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) =>
                      handleInputChange("currentPassword", e.target.value)
                    }
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white ${
                      errors.currentPassword
                        ? "border-red-300 dark:border-red-600"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) =>
                      handleInputChange("newPassword", e.target.value)
                    }
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white ${
                      errors.newPassword
                        ? "border-red-300 dark:border-red-600"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {errors.newPassword}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        Password Strength
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          getPasswordStrength(formData.newPassword).color
                        }`}
                      >
                        {getPasswordStrength(formData.newPassword).text}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getPasswordStrength(formData.newPassword).score === 1
                            ? "bg-red-500 w-1/5"
                            : getPasswordStrength(formData.newPassword)
                                .score === 2
                            ? "bg-orange-500 w-2/5"
                            : getPasswordStrength(formData.newPassword)
                                .score === 3
                            ? "bg-yellow-500 w-3/5"
                            : getPasswordStrength(formData.newPassword)
                                .score === 4
                            ? "bg-blue-500 w-4/5"
                            : getPasswordStrength(formData.newPassword)
                                .score === 5
                            ? "bg-green-500 w-full"
                            : "w-0"
                        }`}
                      ></div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-yellow-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Password Security Tip:</strong>
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            {getPasswordStrength(formData.newPassword).feedback}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white ${
                      errors.confirmPassword
                        ? "border-red-300 dark:border-red-600"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
                {formData.confirmPassword &&
                  formData.newPassword === formData.confirmPassword &&
                  formData.newPassword.length > 0 && (
                    <p className="text-xs text-green-500 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.currentPassword ||
                    !formData.newPassword ||
                    !formData.confirmPassword
                  }
                  className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating Password..." : "UPDATE PASSWORD"}
                </button>
              </div>
            </form>
          </div>

          {/* Password Security Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
              Password Security Tips
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                Use at least 8 characters with a mix of letters, numbers, and
                symbols
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                Avoid using personal information like your name, email, or
                birthday
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                Don&apos;t reuse passwords from other accounts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                Consider using a password manager to generate and store secure
                passwords
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
