import { useState, useEffect } from "react";
import { Loader } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<void> | null = null;

export function useGoogleMaps() {
  const [ready, setReady] = useState(
    typeof google !== "undefined" && !!google.maps?.places
  );

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
      loaderPromise = loader.importLibrary("places").then(() => {});
    }

    loaderPromise.then(() => setReady(true)).catch(console.error);
  }, [ready]);

  return ready;
}
