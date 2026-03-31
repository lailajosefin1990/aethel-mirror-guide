import { useState, useRef, useEffect } from "react";
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

  // Fallback to tz-lookup
  try {
    const lookup = await getTzLookup();
    return lookup(lat, lng);
  } catch {
    return "UTC";
  }
}

const LocationAutocomplete = ({ value, onChange, className }: LocationAutocompleteProps) => {
  const { t } = useTranslation();
  const mapsReady = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["(cities)"],
    },
    debounce: 300,
    initOnMount: false,
  });

  // Init when Google Maps is loaded
  useEffect(() => {
    if (mapsReady) {
      init();
      setValue(value, false);
    }
  }, [mapsReady]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSuggestions();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clearSuggestions]);

  const handleInput = (val: string) => {
    setValue(val);
  };

  const handleSelect = async (description: string, placeId: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = getLatLng(results[0]);

      // Extract city + country from address components
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

  const hasSuggestions = status === "OK" && data.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      {!mapsReady && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin z-10" />
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        disabled={!mapsReady}
        placeholder={
          mapsReady
            ? t("birth_place_placeholder") || "City, Country"
            : "Loading places..."
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
