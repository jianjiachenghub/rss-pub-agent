"use client";

import { useState } from "react";

interface ResilientImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: "hide" | "placeholder";
  placeholderKicker?: string;
  placeholderTitle?: string;
  placeholderHint?: string;
}

export default function ResilientImage({
  src,
  alt,
  className,
  fallback = "hide",
  placeholderKicker = "RSS Agent",
  placeholderTitle = "News Flow",
  placeholderHint = "图片暂不可用",
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    if (fallback === "hide") {
      return null;
    }

    return (
      <div
        aria-label={alt || placeholderHint}
        className={`${className ?? ""} image-fallback`}
        role="img"
      >
        <div className="image-fallback-inner">
          <div className="image-fallback-kicker">{placeholderKicker}</div>
          <div className="image-fallback-title">{placeholderTitle}</div>
          <div className="image-fallback-hint">{placeholderHint}</div>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      aria-label={alt || undefined}
      className={className}
      decoding="async"
      loading="lazy"
      onError={() => setHasError(true)}
      src={src}
    />
  );
}
