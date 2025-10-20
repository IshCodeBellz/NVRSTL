"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import Link from "next/link";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AccountDetailsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: {
      day: "1",
      month: "January",
      year: "1990",
    },
    gender: "Prefer not to say",
    email: "",
    newPassword: "",
    confirmPassword: "",
    contactPreferences: {
      email: true,
      post: false,
      sms: false,
      thirdParty: false,
    },
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      const response = await fetch("/api/account/profile");
      if (response.ok) {
        const userData = await response.json();
        // Parse name into first and last name
        const nameParts = (userData.name || "").split(" ");

        // Parse date of birth
        let dateOfBirth = {
          day: "1",
          month: "January",
          year: "1990",
        };

        if (userData.dateOfBirth) {
          const date = new Date(userData.dateOfBirth);
          dateOfBirth = {
            day: date.getDate().toString(),
            month: months[date.getMonth()],
            year: date.getFullYear().toString(),
          };
        }

        // Parse contact preferences
        const contactPreferences = {
          email: userData.preferences?.emailMarketing ?? true,
          post: userData.preferences?.postMarketing ?? false,
          sms: userData.preferences?.smsMarketing ?? false,
          thirdParty: userData.preferences?.thirdParty ?? false,
        };

        setFormData((prev) => ({
          ...prev,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: userData.email || "",
          gender: userData.gender || "Prefer not to say",
          dateOfBirth,
          contactPreferences,
        }));
      }
    } catch {
      // Error loading user data - keep default state
    } finally {
      setLoading(false);
    }
  }, []); // months is a static array, no need to include in dependencies

  // Load user data from database
  useEffect(() => {
    if (session?.user) {
      loadUserData();
    }
  }, [session, loadUserData]);

  // Handle hash navigation with smooth scrolling
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Small delay to ensure the page is fully rendered
      setTimeout(() => {
        const element = document.getElementById(hash.slice(1));
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    }
  }, []);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      dateOfBirth: {
        ...prev.dateOfBirth,
        [field]: value,
      },
    }));
  };

  const handleContactPreferenceChange = (field: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      contactPreferences: {
        ...prev.contactPreferences,
        [field]: checked,
      },
    }));
  };

  const handleUpdateAccountInfo = async () => {
    try {
      // Create date object from form data
      const dateOfBirth = new Date(
        parseInt(formData.dateOfBirth.year),
        months.indexOf(formData.dateOfBirth.month),
        parseInt(formData.dateOfBirth.day)
      );

      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_profile",
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          dateOfBirth: dateOfBirth.toISOString(),
          gender: formData.gender,
        }),
      });

      if (response.ok) {
        alert("Account information updated successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update account information");
      }
    } catch {
      alert("Failed to update account information");
    }
  };

  const handleUpdatePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_password",
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        alert("Password updated successfully!");
        // Clear password fields
        setFormData((prev) => ({
          ...prev,
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update password");
      }
    } catch {
      alert("Failed to update password");
    }
  };

  const handleUpdateContactPreferences = async () => {
    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_preferences",
          contactPreferences: formData.contactPreferences,
        }),
      });

      if (response.ok) {
        alert("Contact preferences updated successfully!");
        // Scroll to contact preferences section
        const contactPrefsSection = document.getElementById(
          "contact-preferences"
        );
        if (contactPrefsSection) {
          contactPrefsSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update contact preferences");
      }
    } catch {
      alert("Failed to update contact preferences");
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const years = Array.from({ length: 80 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/3 mb-8"></div>
          <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
            <div className="space-y-4">
              <div className="h-32 bg-neutral-200 rounded"></div>
              <div className="h-32 bg-neutral-200 rounded"></div>
            </div>
            <div className="space-y-8">
              <div className="h-64 bg-neutral-200 rounded"></div>
              <div className="h-48 bg-neutral-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">
        Account Details
      </h1>

      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation showBackToAccount={true} />

        {/* Main Content */}
        <div className="space-y-12">
          {/* Account Information Section */}
          <section id="account-information" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                Account Information
              </h2>
            </div>
            <div className="border rounded p-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Date of Birth *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={formData.dateOfBirth.day}
                      onChange={(e) => handleDateChange("day", e.target.value)}
                      className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.dateOfBirth.month}
                      onChange={(e) =>
                        handleDateChange("month", e.target.value)
                      }
                      className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.dateOfBirth.year}
                      onChange={(e) => handleDateChange("year", e.target.value)}
                      className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    You must be 16 or above to use NVRSTL
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Gender (optional)
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      handleInputChange("gender", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateAccountInfo}
                  className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-neutral-800 transition-colors font-medium"
                >
                  UPDATE ACCOUNT INFORMATION
                </button>
              </div>
            </div>
          </section>

          {/* Login Information Section */}
          <section id="login-information" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                Change Password
              </h2>
            </div>
            <div className="border rounded p-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
              <div className="space-y-6">
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
                      className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      {showNewPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.465 8.465m1.413 1.413L8.465 8.465m5.655 5.655L12.707 12.707M14.121 14.121L15.535 15.535m-1.414-1.414L12.707 12.707m1.414 1.414L15.535 15.535"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

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
                            getPasswordStrength(formData.newPassword).score ===
                            1
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
                              {
                                getPasswordStrength(formData.newPassword)
                                  .feedback
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Password has to be at least 6 characters
                  </p>
                </div>

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
                      className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      {showConfirmPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.465 8.465m1.413 1.413L8.465 8.465m5.655 5.655L12.707 12.707M14.121 14.121L15.535 15.535m-1.414-1.414L12.707 12.707m1.414 1.414L15.535 15.535"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.newPassword !== formData.confirmPassword && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Passwords do not match
                      </p>
                    )}
                  {formData.confirmPassword &&
                    formData.newPassword === formData.confirmPassword &&
                    formData.newPassword.length > 0 && (
                      <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                        Passwords match
                      </p>
                    )}
                </div>

                <button
                  onClick={handleUpdatePassword}
                  className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-neutral-800 transition-colors font-medium"
                >
                  UPDATE PASSWORD
                </button>
              </div>
            </div>
          </section>

          {/* Contact Preferences Section */}
          <section id="contact-preferences" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                Contact Preferences
              </h2>
            </div>
            <div className="border rounded p-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
              <div className="space-y-6">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Your current contact preferences are:
                </p>

                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.contactPreferences.email}
                      onChange={(e) =>
                        handleContactPreferenceChange("email", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-neutral-900 dark:text-white">
                      Email
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.contactPreferences.post}
                      onChange={(e) =>
                        handleContactPreferenceChange("post", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-neutral-900 dark:text-white">
                      Post
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.contactPreferences.sms}
                      onChange={(e) =>
                        handleContactPreferenceChange("sms", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-neutral-900 dark:text-white">
                      SMS*
                    </span>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.contactPreferences.thirdParty}
                      onChange={(e) =>
                        handleContactPreferenceChange(
                          "thirdParty",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <span className="text-sm text-neutral-900 dark:text-white">
                      I&apos;d like to receive occasional updates by email,
                      post, and SMS* from carefully selected third parties
                    </span>
                  </label>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-600">
                  <p>
                    *By ticking the SMS box, you are agreeing to receive texts
                    from or on behalf of NVRSTL, our family of
                    companies, or one of its third-party associates, to any
                    telephone number you provide. These texts could be sent
                    using an automated telephone system. Agreement is not a
                    requirement of purchase and you are free to opt-out at any
                    time.
                  </p>
                  <p>
                    By creating your account you agree to our{" "}
                    <Link
                      href="/terms"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Terms & Conditions.
                    </Link>
                  </p>
                  <p>
                    Find out more, please read our{" "}
                    <Link
                      href="/privacy"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Privacy Notice.
                    </Link>
                  </p>
                </div>

                <button
                  onClick={handleUpdateContactPreferences}
                  className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-neutral-800 transition-colors font-medium"
                >
                  UPDATE CONTACT PREFERENCES
                </button>
              </div>
            </div>
          </section>

          {/* Account Actions Section */}
          <section id="account-actions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                Account Actions
              </h2>
            </div>
            <div className="border rounded p-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white py-3 px-4 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors font-medium">
                    CLOSE ACCOUNT
                  </button>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    DELETE ACCOUNT
                  </button>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Warning: Account deletion is permanent and cannot be undone.
                  You will lose all order history, saved items, and account
                  data.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                Delete Account
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Are you sure you want to delete your account? This action cannot
              be undone and you will lose all your order history, saved items,
              and account data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white py-2 px-4 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/account/profile", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        action: "delete_account",
                      }),
                    });

                    if (response.ok) {
                      alert(
                        "Account deleted successfully. You will be logged out."
                      );
                      // Sign out the user
                      window.location.href = "/api/auth/signout";
                    } else {
                      const error = await response.json();
                      alert(error.error || "Failed to delete account");
                    }
                  } catch {
                    alert("Failed to delete account");
                  }
                  setShowDeleteModal(false);
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
