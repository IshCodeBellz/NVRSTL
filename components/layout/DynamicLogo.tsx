"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoSettings {
  logoText?: string;
  logoImageUrl?: string;
  logoType: "text" | "image" | "combined";
  logoTextPrefix?: string;
  logoTextSuffix?: string;
  logoAccentColor?: string;
}

interface DynamicLogoProps {
  className?: string;
  linkClassName?: string;
  textClassName?: string;
}

export function DynamicLogo({
  className = "",
  linkClassName = "font-bold text-lg md:text-xl tracking-tight",
  textClassName = "",
}: DynamicLogoProps) {
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    logoText: "NVRSTL",
    logoImageUrl: undefined,
    logoType: "text",
    logoTextPrefix: "DY",
    logoTextSuffix: "OFFICIALETTE",
    logoAccentColor: "#DC2626",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogoSettings() {
      try {
        // Try to fetch from CMS settings
        const response = await fetch("/api/cms/logo-public");
        if (response.ok) {
          const data = await response.json();
          setLogoSettings(data.logoSettings);
        }
      } catch (error) {
        console.warn("Failed to fetch logo settings, using defaults:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogoSettings();
  }, []);

  if (loading) {
    // Show a simple placeholder while loading
    return (
      <div className={className}>
        <Link href="/" className={linkClassName} aria-label="Home">
          <div className="animate-pulse bg-neutral-200 dark:bg-neutral-700 h-6 w-32 rounded"></div>
        </Link>
      </div>
    );
  }

  const renderTextLogo = () => {
    const prefixColor = "text-neutral-900 dark:text-white";

    if (
      logoSettings.logoType === "text" &&
      logoSettings.logoTextPrefix &&
      logoSettings.logoTextSuffix
    ) {
      return (
        <>
          <span className={`${prefixColor} ${textClassName}`}>
            {logoSettings.logoTextPrefix}
          </span>
          <span
            className={textClassName}
            style={{ color: logoSettings.logoAccentColor }}
          >
            {logoSettings.logoTextSuffix}
          </span>
        </>
      );
    }

    return (
      <span className={`${prefixColor} ${textClassName}`}>
        {logoSettings.logoText || "NVRSTL"}
      </span>
    );
  };

  const renderImageLogo = () => {
    if (!logoSettings.logoImageUrl) return null;

    return (
      <Image
        src={logoSettings.logoImageUrl}
        alt="Logo"
        width={120}
        height={40}
        className="h-8 md:h-10 w-auto object-contain"
        priority
      />
    );
  };

  const renderCombinedLogo = () => {
    return (
      <div className="flex items-center gap-2">
        {logoSettings.logoImageUrl && (
          <Image
            src={logoSettings.logoImageUrl}
            alt="Logo"
            width={32}
            height={32}
            className="h-6 md:h-8 w-auto object-contain"
            priority
          />
        )}
        {renderTextLogo()}
      </div>
    );
  };

  return (
    <div className={className}>
      <Link href="/" className={linkClassName} aria-label="Home">
        {logoSettings.logoType === "image" && logoSettings.logoImageUrl
          ? renderImageLogo()
          : logoSettings.logoType === "combined"
          ? renderCombinedLogo()
          : renderTextLogo()}
      </Link>
    </div>
  );
}
