"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PALETTE = [
  "border-barnwright-gold/50 bg-barnwright-gold/15 text-barnwright-gold-deep",
  "border-status-in/30 bg-status-in/10 text-status-in",
  "border-barnwright-green/20 bg-barnwright-pine/10 text-barnwright-moss",
  "border-status-out/40 bg-status-out/20 text-status-out-strong",
  "border-barnwright-sage/30 bg-barnwright-sage/10 text-barnwright-sage",
] as const;

function hueIndex(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % PALETTE.length;
}

/**
 * Avatar for a horse with real photo support and a deterministic monogram fallback.
 */
export function HorseAvatar({
  name,
  photoUrl,
  size = "md",
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoUrl && !failed);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const sizeClasses = {
    xs: "size-5 text-[0.55rem]",
    sm: "size-7 text-[0.65rem]",
    md: "size-9 text-xs",
    lg: "size-12 text-base",
    xl: "size-16 text-lg",
  }[size];

  if (showPhoto) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-barnwright-green/15 bg-muted shadow-sm",
          sizeClasses,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl!}
          alt={name}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-display font-semibold select-none",
        sizeClasses,
        PALETTE[hueIndex(name)],
        className
      )}
    >
      {initials}
    </span>
  );
}
