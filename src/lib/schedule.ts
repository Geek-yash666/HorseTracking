export const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export const SHIFTS = ["AM", "PM"] as const;

export function formatDaysOfWeek(days: number[]) {
  if (days.length === 7) return "Every day";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label ?? "?")
    .join(", ");
}

/** Returns a date formatted as YYYY-MM-DD in the local timezone */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's local date truncated to midnight UTC (YYYY-MM-DDT00:00:00Z), used for TurnoutEvent date queries */
export function todayDateOnly(): Date {
  const dateStr = getLocalDateString();
  return new Date(`${dateStr}T00:00:00Z`);
}
