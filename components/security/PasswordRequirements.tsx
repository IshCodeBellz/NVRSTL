"use client";

import { Check, X, Info } from "lucide-react";

interface Requirement {
  id: string;
  label: string;
  description: string;
  regex: RegExp;
  met: boolean;
  required: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  className?: string;
  variant?: "default" | "compact" | "detailed";
  showDescription?: boolean;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  className = "",
  variant = "default",
  showDescription = true,
}) => {
  const requirements: Omit<Requirement, "met">[] = [
    {
      id: "minLength",
      label: "Minimum 8 characters",
      description:
        "Longer passwords are more secure against brute force attacks",
      regex: /.{8,}/,
      required: true,
    },
    {
      id: "maxLength",
      label: "Maximum 128 characters",
      description: "Prevents potential memory issues and abuse",
      regex: /^.{0,128}$/,
      required: true,
    },
    {
      id: "lowercase",
      label: "At least one lowercase letter (a-z)",
      description: "Increases character space and complexity",
      regex: /[a-z]/,
      required: true,
    },
    {
      id: "uppercase",
      label: "At least one uppercase letter (A-Z)",
      description: "Further increases password complexity",
      regex: /[A-Z]/,
      required: true,
    },
    {
      id: "number",
      label: "At least one number (0-9)",
      description: "Adds numeric characters to password mix",
      regex: /\d/,
      required: true,
    },
    {
      id: "special",
      label: "At least one special character",
      description: "Use symbols like !@#$%^&* for maximum security",
      regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/,
      required: true,
    },
    {
      id: "noSpaces",
      label: "No spaces allowed",
      description: "Prevents accidental whitespace that may cause issues",
      regex: /^\S*$/,
      required: true,
    },
    {
      id: "noCommonPatterns",
      label: "Avoid common patterns",
      description: "Don't use sequences like 123456, qwerty, or password",
      regex:
        /^(?!.*(?:123456|password|qwerty|admin|letmein|welcome|monkey|dragon|abc123|111111|654321)).*$/i,
      required: true,
    },
    {
      id: "noRepeating",
      label: "No more than 2 repeating characters",
      description: "Prevents simple patterns like 'aaa' or '111'",
      regex: /^(?!.*(.)\1{2,}).*$/,
      required: false,
    },
    {
      id: "noKeyboard",
      label: "Avoid keyboard patterns",
      description: "Don't use patterns like 'asdf' or '1234'",
      regex: /^(?!.*(asdf|qwer|zxcv|1234|4321|abcd|dcba)).*$/i,
      required: false,
    },
  ];

  const evaluatedRequirements: Requirement[] = requirements.map((req) => ({
    ...req,
    met: password ? req.regex.test(password) : false,
  }));

  const requiredCount = evaluatedRequirements.filter(
    (req) => req.required
  ).length;
  const requiredMet = evaluatedRequirements.filter(
    (req) => req.required && req.met
  ).length;
  const optionalMet = evaluatedRequirements.filter(
    (req) => !req.required && req.met
  ).length;
  const totalMet = requiredMet + optionalMet;

  const getRequirementIcon = (requirement: Requirement) => {
    if (requirement.met) {
      return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
    }
    return <X className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />;
  };

  const getRequirementTextColor = (requirement: Requirement) => {
    if (requirement.met) {
      return "text-green-700 dark:text-green-300";
    }
    if (requirement.required) {
      return "text-neutral-900 dark:text-neutral-200";
    }
    return "text-neutral-600 dark:text-neutral-400";
  };

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Requirements Met
          </span>
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {totalMet}/{evaluatedRequirements.length}
          </span>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Required: {requiredMet}/{requiredCount} • Optional: {optionalMet}/
          {evaluatedRequirements.length - requiredCount}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Password Requirements
        </h4>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {totalMet}/{evaluatedRequirements.length} met
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-neutral-900 dark:text-white">
            {requiredMet}/{requiredCount}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            Required
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-neutral-900 dark:text-white">
            {optionalMet}/{evaluatedRequirements.length - requiredCount}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            Optional
          </div>
        </div>
      </div>

      {/* Required Requirements */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
          Required
        </h5>
        <div className="space-y-2">
          {evaluatedRequirements
            .filter((req) => req.required)
            .map((requirement) => (
              <div key={requirement.id} className="space-y-1">
                <div className="flex items-start space-x-2">
                  {getRequirementIcon(requirement)}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm ${getRequirementTextColor(
                        requirement
                      )}`}
                    >
                      {requirement.label}
                    </span>
                    {showDescription && variant === "detailed" && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {requirement.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Optional Requirements */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
          Recommended
        </h5>
        <div className="space-y-2">
          {evaluatedRequirements
            .filter((req) => !req.required)
            .map((requirement) => (
              <div key={requirement.id} className="space-y-1">
                <div className="flex items-start space-x-2">
                  {getRequirementIcon(requirement)}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm ${getRequirementTextColor(
                        requirement
                      )}`}
                    >
                      {requirement.label}
                    </span>
                    {showDescription && variant === "detailed" && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {requirement.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Security Notice */}
      {password && requiredMet === requiredCount && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800 dark:text-green-300">
              <p className="font-medium">Good password!</p>
              <p className="mt-1">
                Your password meets all required criteria. Consider adding the
                optional requirements for even better security.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
