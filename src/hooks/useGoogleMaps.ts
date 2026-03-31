import { useState, useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<unknown> | null = null;
let isLoaded = false;
let optionsSet = false;

export function useGoogleMaps() {
  const [ready, setReady] = useState(isLoaded);

  useEffect(() => {
    if (ready) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY not set — Google Places disabled");
      return;
    }

    if (!optionsSet) {
      setOptions({ key: apiKey, libraries: ["places"] });
      optionsSet = true;
    }

    if (!loaderPromise) {
      loaderPromise = importLibrary("places");
    }

    loaderPromise
      .then(() => {
        isLoaded = true;
        setReady(true);
      })
      .catch(console.error);
  }, [ready]);

  return ready;
}
