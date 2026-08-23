/** Shared small formatting helpers. */

export function formatTime(date: Date | null | undefined) {
  if (!date) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
