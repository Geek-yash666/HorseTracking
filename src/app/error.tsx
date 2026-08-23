"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel mx-auto mt-10 flex max-w-lg flex-col items-center gap-4 px-8 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </span>
      <h1 className="font-display text-2xl font-semibold">
        Something spooked the app
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-onstride-green/65">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
