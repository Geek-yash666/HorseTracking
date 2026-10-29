"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SpacePhoto({
  name,
  photoUrl,
  className,
  sizesClass = "text-3xl",
  alt,
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
  sizesClass?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1c1511] via-[#0f0c0a] to-[#080605]",
        className
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={alt ?? name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "font-display font-semibold text-barnwright-gold/70 select-none",
            sizesClass
          )}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
