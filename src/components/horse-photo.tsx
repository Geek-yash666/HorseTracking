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

/**
 * A horse's photo wherever one exists, with a branded monogram tile as
 * the automatic fallback — covers horses without photos and broken URLs
 * (bad pastes, expired data URLs) without any layout shift.
 */
export function HorsePhoto({
  name,
  photoUrl,
  className,
  sizesClass = "text-3xl",
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
  sizesClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#e9e2d2] via-[#efe9db] to-[#ddd2bc]",
        className
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- photoUrl may be a user-uploaded data URL; next/image adds nothing here
        <img
          src={photoUrl}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "font-display font-semibold text-[#8a7a5c]/70",
            sizesClass
          )}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
