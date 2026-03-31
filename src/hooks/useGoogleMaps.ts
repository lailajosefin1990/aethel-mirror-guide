import { useState, useEffect } from "react";
import { Loader } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<unknown> | null = null;
let isLoaded = false;

export function useGoogleMaps() {
  const [ready, setReady] = useState(isLoaded);

  useEffect(() => {
    if (ready) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY not set — Google Places disabled");
      return;
    }

    if (!loaderPromise) {
      const loader = new Loader({
        apiKey,
        libraries: ["places"],
      });
      loaderPromise = loader.load();
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
