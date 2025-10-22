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
      } catch {
        // Failed to fetch logo settings, using defaults
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
          <div
            className="animate-pulse bg-gray-700 h-24 md:h-32 lg:h-40 w-40 md:w-52 lg:w-64 rounded"
            style={{ transform: "skew(-12deg)" }}
          ></div>
        </Link>
      </div>
    );
  }

  const renderTextLogo = () => {
    const prefixColor = "text-white";

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
      <span
        className={`${prefixColor} ${textClassName} font-black italic`}
        style={{
          fontSize: "clamp(60px, 10vw, 120px)",
          lineHeight: "clamp(60px, 10vw, 120px)",
          transform: "skew(-12deg)",
          letterSpacing: "-0.02em",
        }}
      >
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
        width={300}
        height={120}
        className="h-24 md:h-32 lg:h-40 w-auto object-contain"
        priority
      />
    );
  };

  const renderCombinedLogo = () => {
    return (
      <div className="flex items-center gap-6">
        {logoSettings.logoImageUrl && (
          <Image
            src={logoSettings.logoImageUrl}
            alt="Logo"
            width={120}
            height={120}
            className="h-16 md:h-20 lg:h-24 w-auto object-contain"
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
