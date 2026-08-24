"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Droplets,
  MapPin,
  Navigation,
  Search,
  Wind,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRESET_WEATHER_LOCATIONS,
  describeWeatherCode,
  fetchWeather,
  searchLocations,
  requestBarnGPSLocation,
  type WeatherData,
  type WeatherLocation,
} from "@/lib/weather";

const LOC_CUSTOM_STORAGE_KEY = "onstride-weather-custom-loc";
const GPS_STORAGE_KEY = "onstride-weather-gps-loc";
const UNIT_STORAGE_KEY = "onstride-weather-unit";

const subscribeNoop = () => () => {};

const readStoredCustomLoc = () =>
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(LOC_CUSTOM_STORAGE_KEY);

const readStoredGPSLoc = () =>
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(GPS_STORAGE_KEY);

const readStoredUnit = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(UNIT_STORAGE_KEY);

const serverNull = () => null;

function useStoredCustomLocation(): WeatherLocation | null {
  const raw = useSyncExternalStore(subscribeNoop, readStoredCustomLoc, serverNull);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);
}

function useStoredGPSLocation(): WeatherLocation | null {
  const raw = useSyncExternalStore(subscribeNoop, readStoredGPSLoc, serverNull);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);
}

function useStoredUnit(): "f" | "c" {
  const raw = useSyncExternalStore(subscribeNoop, readStoredUnit, serverNull);
  return raw === "c" ? "c" : "f";
}

function todayParts(todayISO: string) {
  const [y, m, d] = todayISO.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function formatIsoDisplay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function offsetIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  const newY = dateObj.getUTCFullYear();
  const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const newD = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${newY}-${newM}-${newD}`;
}

/* ------------------------------------------------------------------ */
/* Weather Widget                                                      */
/* ------------------------------------------------------------------ */

function WeatherPanel({ todayISO }: { todayISO: string }) {
  const storedLocation = useStoredCustomLocation();
  const storedGPSLocation = useStoredGPSLocation();
  const storedUnit = useStoredUnit();

  // Priority: GPS > Custom > Preset
  const [locationOverride, setLocationOverride] = useState<WeatherLocation | null>(null);
  const [gpsStatus, setGPSStatus] = useState<"idle" | "loading" | "error">("idle");
  const activeLocation =
    locationOverride ?? storedGPSLocation ?? storedLocation ?? PRESET_WEATHER_LOCATIONS[0];
  
  // Track location source for display
  const locationSource = locationOverride
    ? "custom"
    : storedGPSLocation
      ? "gps"
      : storedLocation
        ? "custom"
        : "preset";

  const [unitOverride, setUnitOverride] = useState<"f" | "c" | null>(null);
  const unit: "f" | "c" = unitOverride ?? storedUnit;

  // Weather data fetch state — keyed so a stale response never renders.
  const [result, setResult] = useState<{
    key: string;
    data?: WeatherData;
    failed?: boolean;
  } | null>(null);

  // Collapsed to 1-day by default
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOutcome, setSearchOutcome] = useState<{
    key: string;
    list: WeatherLocation[];
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = `${activeLocation.lat}:${activeLocation.lon}:${unit}`;
    let cancelled = false;

    fetchWeather(activeLocation, unit)
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [activeLocation, unit]);

  // Debounced geocoding search — results keyed to the query that asked
  // for them, so trimming the box instantly hides stale hits without
  // any synchronous setState.
  const trimmedQuery = searchQuery.trim();
  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchLocations(trimmedQuery).then((list) => {
        if (!cancelled) setSearchOutcome({ key: trimmedQuery, list });
      });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  const searchResultsList =
    searchOutcome?.key === trimmedQuery ? searchOutcome.list : [];
  const isSearching =
    trimmedQuery.length >= 2 && searchOutcome?.key !== trimmedQuery;

  // Focus the input once the modal mounts; no state writes needed.
  useEffect(() => {
    if (!showSearchModal) return;
    const timer = setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [showSearchModal]);

  function closeSearch() {
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchOutcome(null);
  }

  const selectLocation = (loc: WeatherLocation) => {
    setLocationOverride(loc);
    window.localStorage.setItem(LOC_CUSTOM_STORAGE_KEY, JSON.stringify(loc));
    // Clear GPS when user manually selects a city
    window.localStorage.removeItem(GPS_STORAGE_KEY);
    closeSearch();
  };

  const handleUseGPS = async () => {
    setGPSStatus("loading");
    try {
      const gpsLoc = await requestBarnGPSLocation();
      setLocationOverride(gpsLoc);
      window.localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify(gpsLoc));
      // Clear custom location when using GPS
      window.localStorage.removeItem(LOC_CUSTOM_STORAGE_KEY);
      setGPSStatus("idle");
    } catch {
      setGPSStatus("error");
      setTimeout(() => setGPSStatus("idle"), 3000);
    }
  };

  const toggleUnit = () => {
    const next = unit === "f" ? "c" : "f";
    setUnitOverride(next);
    window.localStorage.setItem(UNIT_STORAGE_KEY, next);
  };

  const requestKey = `${activeLocation.lat}:${activeLocation.lon}:${unit}`;
  const weather = result?.key === requestKey ? result.data : undefined;
  const failed = result?.key === requestKey ? Boolean(result.failed) : false;
  const current = weather ? describeWeatherCode(weather.current.code) : null;
  const unitLabel = unit === "f" ? "°F" : "°C";
  const windLabel = unit === "f" ? "mph" : "km/h";

  const todayForecast = weather?.daily.find((d) => d.date === todayISO) ?? weather?.daily[0];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5">
        <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-onstride-gold/85">
          <MapPin className="size-3 text-onstride-gold" />
          Barn weather
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleUnit}
            title="Switch °F / °C"
            className="rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream transition-colors"
          >
            {unitLabel}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            title={isExpanded ? "Collapse to 1 day" : "Expand 10-day forecast"}
            className="flex size-6 items-center justify-center rounded-md text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="size-3.5 text-onstride-gold" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* GPS Location Button - Prominent */}
      <button
        type="button"
        onClick={handleUseGPS}
        disabled={gpsStatus === "loading"}
        className={cn(
          "mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all",
          gpsStatus === "loading"
            ? "border-onstride-gold/30 bg-onstride-gold/10 text-onstride-gold animate-pulse"
            : gpsStatus === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-onstride-gold/40 bg-onstride-gold/10 text-onstride-gold hover:bg-onstride-gold/20 hover:border-onstride-gold/60"
        )}
      >
        <Navigation className={cn("size-3.5", gpsStatus === "loading" && "animate-spin")} />
        {gpsStatus === "loading"
          ? "Getting GPS location..."
          : gpsStatus === "error"
            ? "GPS unavailable — tap to retry"
            : "Use barn GPS location"}
      </button>

      {/* Location Source Indicator */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[0.6rem]">
        <span
          className={cn(
            "size-1.5 rounded-full",
            locationSource === "gps" ? "bg-green-400" : "bg-onstride-gold"
          )}
        />
        <span className="text-onstride-cream/50">
          {locationSource === "gps"
            ? "GPS (precise)"
            : `Using ${locationSource === "custom" ? "selected city" : "default location"}`}
        </span>
      </div>

      {/* Location Selector Button with Search Trigger */}
      <button
        type="button"
        onClick={() => setShowSearchModal(true)}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-left text-xs font-medium text-onstride-cream transition-colors hover:border-onstride-gold/60 hover:bg-white/15"
      >
        <span className="truncate">{activeLocation.name}</span>
        <Search className="size-3 shrink-0 text-onstride-gold/80" />
      </button>

      {/* Location Search Dialog / Overlay */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#10241c] p-4 text-white shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-onstride-gold">
                <Search className="size-3.5" />
                <span>Search Barn Location</span>
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-3">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type city or town (e.g. Wellington, Ocala)..."
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 pl-9 text-xs text-white placeholder-white/40 outline-none focus:border-onstride-gold focus:ring-1 focus:ring-onstride-gold"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-white/50" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-white/40 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown List */}
            {isSearching && (
              <p className="mt-3 text-center text-xs text-white/50 animate-pulse">
                Searching locations…
              </p>
            )}

            {searchResultsList.length > 0 && (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-white/5 p-1">
                {searchResultsList.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => selectLocation(loc)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-white/90 hover:bg-white/15 transition-colors"
                  >
                    <span className="font-medium truncate">{loc.name}</span>
                    <span className="text-[10px] text-white/40 uppercase shrink-0 ml-2">
                      {loc.country}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResultsList.length === 0 && (
              <p className="mt-3 text-center text-xs text-white/50">
                No matching locations found.
              </p>
            )}

            {/* Popular Equestrian Hub Presets */}
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-onstride-gold/80 mb-2">
                Popular Equestrian Hubs
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {PRESET_WEATHER_LOCATIONS.map((preset) => {
                  const isSelected = activeLocation.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectLocation(preset)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
                        isSelected
                          ? "border-onstride-gold bg-onstride-gold/20 text-onstride-gold font-semibold"
                          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="truncate">{preset.name}</span>
                      {isSelected && <Check className="size-3 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {!weather && !failed && (
        <div className="mt-3 animate-pulse">
          <div className="h-8 w-24 rounded bg-white/10" />
          <div className="mt-2 h-3 w-32 rounded bg-white/10" />
        </div>
      )}

      {failed && (
        <p className="mt-3 text-xs leading-relaxed text-onstride-cream/50">
          Weather unavailable right now — the barn works fine without it.
        </p>
      )}

      {/* Weather Content */}
      {weather && current && (
        <>
          {/* ================= 1-DAY COLLAPSED VIEW ================= */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <current.Icon className="size-8 shrink-0 text-onstride-gold" />
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-semibold tabular-nums text-onstride-cream">
                      {weather.current.temp}
                    </span>
                    <span className="text-sm font-medium text-onstride-cream/70">
                      {unitLabel}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-onstride-cream/80 leading-none mt-0.5">
                    {current.label}
                  </p>
                </div>
              </div>

              {/* Today's Hi / Lo pill */}
              {todayForecast && (
                <div className="rounded-lg bg-white/10 px-2 py-1 text-right text-xs tabular-nums text-onstride-cream/80">
                  <div className="text-[10px] text-onstride-cream/50 font-medium">TODAY</div>
                  <span className="font-semibold">{todayForecast.hi}°</span>{" "}
                  <span className="text-onstride-cream/40">{todayForecast.lo}°</span>
                </div>
              )}
            </div>

            {/* Current Conditions Strip */}
            <div className="mt-2.5 flex items-center gap-3 text-[0.68rem] text-onstride-cream/60">
              <span className="inline-flex items-center gap-1">
                <Wind className="size-3 text-sky-300" />
                {weather.current.wind} {windLabel}
              </span>
              {weather.current.precipChance != null && (
                <span className="inline-flex items-center gap-1">
                  <Droplets className="size-3 text-sky-300" />
                  {weather.current.precipChance}% rain
                </span>
              )}
            </div>
          </div>

          {/* ================= EXPANDABLE MULTI-DAY FORECAST WITH SMOOTH ACCORDION ================= */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              isExpanded
                ? "grid-rows-[1fr] opacity-100 mt-3 pt-2.5 border-t border-white/10"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-1.5">
                {weather.daily.map((day) => {
                  const info = describeWeatherCode(day.code);
                  const isToday = day.date === todayISO;
                  return (
                    <div
                      key={day.date}
                      className="flex items-center justify-between gap-2 text-[0.7rem]"
                    >
                      <span
                        className={cn(
                          "w-12 shrink-0 font-semibold",
                          isToday ? "text-onstride-gold" : "text-onstride-cream/60"
                        )}
                      >
                        {isToday
                          ? "Today"
                          : new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-US", {
                              weekday: "short",
                              timeZone: "UTC",
                            })}
                      </span>
                      <info.Icon className="size-3.5 shrink-0 text-onstride-cream/70" />
                      {day.precipChance != null && day.precipChance > 20 && (
                        <span className="inline-flex items-center gap-0.5 text-sky-300 text-[10px]">
                          <Droplets className="size-2.5" />
                          {day.precipChance}%
                        </span>
                      )}
                      <span className="ml-auto tabular-nums text-onstride-cream/80">
                        {day.hi}° <span className="text-onstride-cream/40">{day.lo}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Toggle expand/collapse button */}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-onstride-gold/75 hover:bg-white/5 hover:text-onstride-gold transition-colors"
          >
            <span>{isExpanded ? "Collapse to 1 day" : "10-day forecast"}</span>
            {isExpanded ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar Widget                                                     */
/* ------------------------------------------------------------------ */

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniCalendar({ todayISO }: { todayISO: string }) {
  const router = useRouter();
  const initial = useMemo(() => {
    const { year, month } = todayParts(todayISO);
    return { year, month };
  }, [todayISO]);

  // Selected date in the widget (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);

  // Month navigation view
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Collapsed to 1-day by default
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar?year=${viewYear}&month=${viewMonth}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setCounts(json.counts ?? {});
      })
      .catch(() => {
        if (!cancelled) setCounts({});
      });
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth]);

  const stepMonth = useCallback(
    (delta: number) => {
      let m = viewMonth + delta;
      let y = viewYear;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      setViewMonth(m);
      setViewYear(y);
    },
    [viewMonth, viewYear]
  );

  const stepDay = useCallback(
    (delta: number) => {
      const nextDate = offsetIsoDate(selectedDate, delta);
      setSelectedDate(nextDate);
      const { year, month } = todayParts(nextDate);
      setViewYear(year);
      setViewMonth(month);
    },
    [selectedDate]
  );

  const grid = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(
        `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  const selectedCount = counts[selectedDate] ?? 0;
  const isSelectedToday = selectedDate === todayISO;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-onstride-gold/85">
          <CalendarIcon className="size-3 text-onstride-gold" />
          Schedule
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            title={isExpanded ? "Collapse to 1 day" : "Expand full month calendar"}
            className="flex size-6 items-center justify-center rounded-md text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="size-3.5 text-onstride-gold" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ================= 1-DAY COLLAPSED CARD ================= */}
      <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2">
        <button
          type="button"
          onClick={() => stepDay(-1)}
          aria-label="Previous day"
          className="flex size-7 items-center justify-center rounded-md text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => router.push(`/board?date=${selectedDate}`)}
          title="Open this date on Today's Board"
          className="flex flex-col items-center group px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <span className="text-xs font-semibold text-onstride-cream group-hover:text-onstride-gold transition-colors">
            {formatIsoDisplay(selectedDate)}
          </span>
          <span className="text-[10px] text-onstride-gold font-medium">
            {isSelectedToday ? "Today" : "View Board"} · {selectedCount}{" "}
            turnout{selectedCount === 1 ? "" : "s"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => stepDay(1)}
          aria-label="Next day"
          className="flex size-7 items-center justify-center rounded-md text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* ================= EXPANDABLE FULL MONTH CALENDAR WITH SMOOTH ACCORDION ================= */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100 mt-3 pt-2.5 border-t border-white/10"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {/* Month Stepper */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-onstride-cream">{monthLabel}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                aria-label="Previous month"
                className="flex size-5 items-center justify-center rounded-md text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream"
              >
                <ChevronLeft className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                aria-label="Next month"
                className="flex size-5 items-center justify-center rounded-md text-onstride-cream/60 hover:bg-white/10 hover:text-onstride-cream"
              >
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>

          {/* 7-Column Month Grid */}
          <div className="grid grid-cols-7 gap-px text-center">
            {WEEKDAY_LETTERS.map((letter, i) => (
              <span
                key={i}
                className="pb-1 text-[0.58rem] font-bold uppercase text-onstride-cream/35"
              >
                {letter}
              </span>
            ))}
            {grid.map((dateISO, i) => {
              if (!dateISO) return <span key={`blank-${i}`} />;
              const dayNum = Number(dateISO.slice(8));
              const isToday = dateISO === todayISO;
              const isSelected = dateISO === selectedDate;
              const count = counts[dateISO] ?? 0;
              return (
                <button
                  key={dateISO}
                  type="button"
                  title={
                    count > 0
                      ? `${count} turnout${count === 1 ? "" : "s"} scheduled`
                      : undefined
                  }
                  onClick={() => {
                    setSelectedDate(dateISO);
                    router.push(`/board?date=${dateISO}`);
                  }}
                  className={cn(
                    "relative flex h-7 flex-col items-center justify-center rounded-md text-[0.7rem] transition-colors",
                    isSelected
                      ? "bg-onstride-gold font-bold text-[#10241c] shadow"
                      : isToday
                        ? "bg-onstride-gold/25 font-bold text-onstride-gold ring-1 ring-inset ring-onstride-gold/60"
                        : "text-onstride-cream/75 hover:bg-white/10 hover:text-onstride-cream"
                  )}
                >
                  {dayNum}
                  {count > 0 && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 size-1 rounded-full",
                        isSelected ? "bg-[#10241c]" : "bg-onstride-gold"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 flex items-center justify-between text-[0.6rem] text-onstride-cream/45">
            <span className="flex items-center gap-1">
              <span className="inline-block size-1 rounded-full bg-onstride-gold" />
              Click date to open board
            </span>
            {!isSelectedToday && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayISO);
                  const { year, month } = todayParts(todayISO);
                  setViewYear(year);
                  setViewMonth(month);
                }}
                className="text-onstride-gold hover:underline font-medium"
              >
                Go to Today
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Quick Expand / Collapse button */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-onstride-gold/75 hover:bg-white/5 hover:text-onstride-gold transition-colors"
      >
        <span>{isExpanded ? "Collapse to 1 day" : "Full month view"}</span>
        {isExpanded ? (
          <ChevronUp className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )}
      </button>
    </div>
  );
}

export function SidebarWidgets({ todayISO }: { todayISO: string }) {
  return (
    <div className="flex flex-col gap-3 px-3 pb-5">
      <MiniCalendar todayISO={todayISO} />
      <WeatherPanel todayISO={todayISO} />
    </div>
  );
}
