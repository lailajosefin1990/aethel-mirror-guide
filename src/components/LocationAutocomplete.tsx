import { useState, useRef, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

export interface LocationResult {
  name: string;
  lat: number;
  lng: number;
  timezone: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: LocationResult) => void;
  className?: string;
}

// Lazy-load tz-lookup as fallback for timezone
let tzLookup: ((lat: number, lng: number) => string) | null = null;
async function getTzLookup() {
  if (!tzLookup) {
    const mod = await import("tz-lookup");
    tzLookup = mod.default || mod;
  }
  return tzLookup;
}

async function fetchTimezone(lat: number, lng: number): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.timeZoneId) {
        return data.timeZoneId;
      }
    } catch (err) {
      console.warn("Google Timezone API failed, falling back to tz-lookup:", err);
    }
  }

  try {
    const lookup = await getTzLookup();
    return lookup(lat, lng);
  } catch {
    return "UTC";
  }
}

interface NominatimResult {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

const LocationAutocomplete = ({ value, onChange, className }: LocationAutocompleteProps) => {
  const { t } = useTranslation();
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const useFallback = mapsError;

  // --- Google Places mode ---
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: { types: ["(cities)"] },
    debounce: 300,
    initOnMount: false,
  });

  useEffect(() => {
    if (mapsReady && !useFallback) {
      init();
      setValue(value, false);
    }
  }, [mapsReady]);

  // --- Nominatim fallback mode ---
  const [fallbackInput, setFallbackInput] = useState(value);
  const [fallbackResults, setFallbackResults] = useState<NominatimResult[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const fallbackTimeout = useRef<ReturnType<typeof setTimeout>>();

  const searchFallback = useCallback(async (query: string) => {
    if (query.length < 3) {
      setFallbackResults([]);
      return;
    }
    setFallbackLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&type=city`,
        { headers: { "Accept-Language": navigator.language || "en" } }
      );
      const data = await res.json();
      setFallbackResults(
        data.map((item: any) => ({
          name: item.display_name.split(",").slice(0, 2).join(",").trim(),
          fullName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }))
      );
    } catch {
      setFallbackResults([]);
    }
    setFallbackLoading(false);
  }, []);

  const handleFallbackInput = (val: string) => {
    setFallbackInput(val);
    clearTimeout(fallbackTimeout.current);
    fallbackTimeout.current = setTimeout(() => searchFallback(val), 300);
  };

  const handleFallbackSelect = async (result: NominatimResult) => {
    setFallbackInput(result.name);
    setFallbackResults([]);
    const timezone = await fetchTimezone(result.lat, result.lng);
    onChange({ name: result.name, lat: result.lat, lng: result.lng, timezone });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSuggestions();
        setFallbackResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clearSuggestions]);

  // --- Google handlers ---
  const handleInput = (val: string) => {
    setValue(val);
  };

  const handleSelect = async (description: string, placeId: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = getLatLng(results[0]);

      const components = results[0].address_components;
      const city =
        components.find((c) => c.types.includes("locality"))?.long_name ||
        components.find((c) => c.types.includes("administrative_area_level_1"))?.long_name ||
        description.split(",")[0];
      const country =
        components.find((c) => c.types.includes("country"))?.long_name || "";
      const name = country ? `${city}, ${country}` : city;

      const timezone = await fetchTimezone(lat, lng);

      setValue(name, false);
      onChange({ name, lat, lng, timezone });
    } catch (err) {
      console.error("Geocoding error:", err);
    }
  };

  const inputClass =
    "w-full h-12 px-4 pl-10 rounded-sm bg-card text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300";

  // --- Fallback rendering ---
  if (useFallback) {
    const hasResults = fallbackResults.length > 0;
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        {fallbackLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin z-10" />
        )}
        <input
          type="text"
          value={fallbackInput}
          onChange={(e) => handleFallbackInput(e.target.value)}
          placeholder={t("birth_place_placeholder") || "Search for a city..."}
          className={inputClass}
        />
        {hasResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-sm shadow-lg z-50 overflow-hidden">
            {fallbackResults.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleFallbackSelect(r)}
                className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-body text-[14px] text-foreground font-medium">
                  {r.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Google Places rendering ---
  const isLoading = !mapsReady;
  const hasSuggestions = status === "OK" && data.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin z-10" />
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        disabled={isLoading}
        placeholder={
          isLoading
            ? "Loading places..."
            : t("birth_place_placeholder") || "City, Country"
        }
        className={inputClass}
      />

      {hasSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-sm shadow-lg z-50 overflow-hidden">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;
            return (
              <button
                key={place_id}
                type="button"
                onClick={() => handleSelect(suggestion.description, place_id)}
                className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-body text-[14px] text-foreground font-medium">
                  {main_text}
                </span>
                {secondary_text && (
                  <span className="font-body text-[12px] text-muted-foreground">
                    {secondary_text}
                  </span>
                )}
              </button>
            );
          })}
          <div className="px-4 py-1.5 bg-muted/20">
            <img
              src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_non_white.png"
              alt="Powered by Google"
              className="h-3 opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
