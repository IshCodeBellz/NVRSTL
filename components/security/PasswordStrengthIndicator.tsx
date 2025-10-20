"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, X, AlertCircle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showCriteria?: boolean;
}

interface StrengthCriteria {
  id: string;
  label: string;
  regex: RegExp;
  met: boolean;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  bgColor: string;
  criteria: StrengthCriteria[];
}

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password, className = "", showCriteria = true }) => {
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: "Very Weak",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500",
    criteria: [],
  });

  const criteria = useMemo<Omit<StrengthCriteria, "met">[]>(
    () => [
      {
        id: "length",
        label: "At least 8 characters",
        regex: /.{8,}/,
      },
      {
        id: "lowercase",
        label: "Contains lowercase letter",
        regex: /[a-z]/,
      },
      {
        id: "uppercase",
        label: "Contains uppercase letter",
        regex: /[A-Z]/,
      },
      {
        id: "number",
        label: "Contains number",
        regex: /\d/,
      },
      {
        id: "special",
        label: "Contains special character",
        regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/,
      },
      {
        id: "noCommon",
        label: "Not a common password",
        regex:
          /^(?!.*(?:password|123456|qwerty|admin|letmein|welcome|monkey|dragon)).*$/i,
      },
    ],
    []
  );

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        label: "Enter password",
        color: "text-neutral-500 dark:text-neutral-400",
        bgColor: "bg-neutral-300 dark:bg-neutral-600",
        criteria: criteria.map((c) => ({ ...c, met: false })),
      });
      return;
    }

    const evaluatedCriteria = criteria.map((criterion) => ({
      ...criterion,
      met: criterion.regex.test(password),
    }));

    const metCount = evaluatedCriteria.filter((c) => c.met).length;
    let strengthData: Omit<PasswordStrength, "criteria">;

    if (metCount <= 2) {
      strengthData = {
        score: 1,
        label: "Very Weak",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500",
      };
    } else if (metCount === 3) {
      strengthData = {
        score: 2,
        label: "Weak",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500",
      };
    } else if (metCount === 4) {
      strengthData = {
        score: 3,
        label: "Good",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-500",
      };
    } else if (metCount === 5) {
      strengthData = {
        score: 4,
        label: "Strong",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500",
      };
    } else {
      strengthData = {
        score: 5,
        label: "Very Strong",
        color: "text-green-700 dark:text-green-300",
        bgColor: "bg-green-600",
      };
    }

    setStrength({
      ...strengthData,
      criteria: evaluatedCriteria,
    });
  }, [password, criteria]);

  const getProgressWidth = () => {
    if (strength.score === 0) return "0%";
    return `${(strength.score / 5) * 100}%`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Password Strength
          </span>
          <span className={`text-sm font-medium ${strength.color}`}>
            {strength.label}
          </span>
        </div>

        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-out ${strength.bgColor}`}
            style={{ width: getProgressWidth() }}
          />
        </div>
      </div>

      {/* Criteria Checklist */}
      {showCriteria && password && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            Requirements
          </h4>
          <div className="grid grid-cols-1 gap-1">
            {strength.criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center space-x-2 text-sm"
              >
                {criterion.met ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                )}
                <span
                  className={`${
                    criterion.met
                      ? "text-green-700 dark:text-green-300"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {criterion.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tips */}
      {password && strength.score < 4 && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">Password Security Tip:</p>
              <p className="mt-1">
                Use a unique password that you haven&apos;t used elsewhere.
                Consider using a passphrase with mixed characters.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
