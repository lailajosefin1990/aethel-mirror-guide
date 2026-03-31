import { useState, useRef, useCallback, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// Lazy-load tz-lookup
let tzLookup: ((lat: number, lng: number) => string) | null = null;
async function getTzLookup() {
  if (!tzLookup) {
    const mod = await import("tz-lookup");
    tzLookup = mod.default || mod;
  }
  return tzLookup;
}

const LocationAutocomplete = ({ value, onChange, className }: LocationAutocompleteProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }
    setLoading(true);
    setNoResults(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowDropdown(true);
      setNoResults(data.length === 0);
    } catch {
      setResults([]);
      setNoResults(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = async (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address;
    const city = addr?.city || addr?.town || addr?.village || "";
    const country = addr?.country || "";
    const name = city ? `${city}, ${country}` : result.display_name.split(",").slice(0, 2).join(",").trim();

    let tz = "UTC";
    try {
      const lookup = await getTzLookup();
      tz = lookup(lat, lng);
    } catch {
      tz = "UTC";
    }

    setQuery(name);
    setShowDropdown(false);
    onChange({ name, lat, lng, timezone: tz });
  };

  const formatResult = (r: NominatimResult) => {
    const addr = r.address;
    const city = addr?.city || addr?.town || addr?.village || r.display_name.split(",")[0];
    const country = addr?.country || "";
    return { city, country };
  };

  const inputClass =
    "w-full h-12 px-4 pl-10 rounded-sm bg-card text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin z-10" />
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={t("birth_place_placeholder") || "City, Country"}
        className={inputClass}
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-sm shadow-lg z-50 overflow-hidden">
          {noResults ? (
            <p className="px-4 py-3 font-body text-[13px] text-muted-foreground">
              {t("birth_place_no_results") || "Can't find that location — try the nearest large city"}
            </p>
          ) : (
            results.map((r, i) => {
              const { city, country } = formatResult(r);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-body text-[14px] text-foreground font-medium">{city}</span>
                  {country && (
                    <span className="font-body text-[12px] text-muted-foreground">{country}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
