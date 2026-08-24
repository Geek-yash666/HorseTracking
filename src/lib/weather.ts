import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

export type WeatherLocation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  admin1?: string;
  country?: string;
};

/** Curated equestrian hub presets for quick 1-click selection. */
export const PRESET_WEATHER_LOCATIONS: WeatherLocation[] = [
  { id: "ocala-fl", name: "Ocala, FL", lat: 29.1872, lon: -82.1401, admin1: "Florida", country: "United States" },
  { id: "wellington-fl", name: "Wellington, FL", lat: 26.6646, lon: -80.2412, admin1: "Florida", country: "United States" },
  { id: "lexington-ky", name: "Lexington, KY", lat: 38.0406, lon: -84.5037, admin1: "Kentucky", country: "United States" },
  { id: "tryon-nc", name: "Tryon, NC", lat: 35.2082, lon: -82.2501, admin1: "North Carolina", country: "United States" },
  { id: "middleburg-va", name: "Middleburg, VA", lat: 39.1337, lon: -77.7533, admin1: "Virginia", country: "United States" },
  { id: "aiken-sc", name: "Aiken, SC", lat: 33.5604, lon: -81.7196, admin1: "South Carolina", country: "United States" },
  { id: "devon-pa", name: "Devon, PA", lat: 40.0034, lon: -75.4254, admin1: "Pennsylvania", country: "United States" },
  { id: "amarillo-tx", name: "Amarillo, TX", lat: 35.222, lon: -101.8313, admin1: "Texas", country: "United States" },
];

export const WEATHER_LOCATIONS = PRESET_WEATHER_LOCATIONS;

const WMO_ICONS = {
  clear: Sun,
  cloudySun: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  hail: CloudHail,
} as const;

/** WMO weather interpretation codes → label + icon. */
export function describeWeatherCode(code: number): {
  label: string;
  Icon: (typeof WMO_ICONS)[keyof typeof WMO_ICONS];
} {
  if (code === 0) return { label: "Clear", Icon: WMO_ICONS.clear };
  if (code <= 2) return { label: "Partly cloudy", Icon: WMO_ICONS.cloudySun };
  if (code === 3) return { label: "Overcast", Icon: WMO_ICONS.cloud };
  if (code <= 48) return { label: "Foggy", Icon: WMO_ICONS.fog };
  if (code <= 57) return { label: "Drizzle", Icon: WMO_ICONS.drizzle };
  if (code <= 67) return { label: "Rain", Icon: WMO_ICONS.rain };
  if (code <= 77) return { label: "Snow", Icon: WMO_ICONS.snow };
  if (code <= 82) return { label: "Showers", Icon: WMO_ICONS.rain };
  if (code <= 86) return { label: "Snow showers", Icon: WMO_ICONS.snow };
  if (code === 95) return { label: "Thunderstorm", Icon: WMO_ICONS.storm };
  return { label: "Storm w/ hail", Icon: WMO_ICONS.hail };
}

export type WeatherData = {
  current: {
    temp: number;
    code: number;
    wind: number;
    precipChance: number | null;
  };
  daily: {
    date: string; // YYYY-MM-DD
    code: number;
    hi: number;
    lo: number;
    precipChance: number | null;
  }[];
};

/**
 * Request the barn's GPS location via browser geolocation API.
 * Returns a WeatherLocation with exact coordinates for hyper-local weather.
 */
export function requestBarnGPSLocation(): Promise<WeatherLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          id: "gps-barn",
          name: "Barn (GPS Location)",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  });
}

/**
 * Search worldwide cities/towns using Open-Meteo Geocoding API.
 * Free, fast, CORS-enabled, no API key needed.
 */
export async function searchLocations(query: string): Promise<WeatherLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        trimmed
      )}&count=8&language=en&format=json`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: {
        id?: number;
        name?: string;
        admin1?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
      }[];
    };
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((r) => {
      const nameParts = [r.name ?? "Unknown"];
      if (r.admin1) nameParts.push(r.admin1);
      else if (r.country) nameParts.push(r.country);

      return {
        id: `geo-${r.id ?? `${r.latitude},${r.longitude}`}`,
        name: nameParts.join(", "),
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        admin1: r.admin1,
        country: r.country,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Open-Meteo — free, no API key, CORS-enabled. Fetched straight from the
 * browser so the server never proxies or caches weather.
 */
export async function fetchWeather(
  location: WeatherLocation,
  unit: "f" | "c"
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "10",
    timezone: "auto",
    temperature_unit: unit === "f" ? "fahrenheit" : "celsius",
    wind_speed_unit: unit === "f" ? "mph" : "kmh",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);

  const json = await res.json();
  return {
    current: {
      temp: Math.round(json.current.temperature_2m),
      code: json.current.weather_code,
      wind: Math.round(json.current.wind_speed_10m),
      precipChance: json.daily?.precipitation_probability_max?.[0] ?? null,
    },
    daily: (json.daily.time as string[]).map((date: string, i: number) => ({
      date,
      code: json.daily.weather_code[i],
      hi: Math.round(json.daily.temperature_2m_max[i]),
      lo: Math.round(json.daily.temperature_2m_min[i]),
      precipChance: json.daily.precipitation_probability_max?.[i] ?? null,
    })),
  };
}
