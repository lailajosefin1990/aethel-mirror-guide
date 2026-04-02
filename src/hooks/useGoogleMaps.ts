import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<unknown> | null = null;
let isLoaded = false;
let hasFailed = false;
let optionsSet = false;

export function useGoogleMaps() {
  const [ready, setReady] = useState(isLoaded);
  const [error, setError] = useState(hasFailed);

  useEffect(() => {
    if (ready || error) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY not set — using fallback geocoding");
      hasFailed = true;
      setError(true);
      return;
    }

    if (!optionsSet) {
      setOptions({ key: apiKey, libraries: ["places"] });
      optionsSet = true;
    }

    if (!loaderPromise) {
      loaderPromise = importLibrary("places");
    }

    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn("Google Maps load timed out — using fallback geocoding");
        hasFailed = true;
        setError(true);
      }
    }, 5000);

    loaderPromise
      .then(() => {
        clearTimeout(timeout);
        isLoaded = true;
        setReady(true);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.warn("Google Maps failed to load:", err);
        hasFailed = true;
        setError(true);
      });

    return () => clearTimeout(timeout);
  }, [ready, error]);

  return { ready, error };
}
