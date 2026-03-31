import { useEffect } from "react";

interface OgImageProps {
  thirdWay: string;
  domain: string;
}

/**
 * Dynamically sets og:image meta tag for the current reading.
 * Uses the share-card edge function to generate the OG image.
 */
const useOgImage = ({ thirdWay, domain }: OgImageProps) => {
  useEffect(() => {
    if (!thirdWay) return;

    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-card?text=${encodeURIComponent(thirdWay)}&domain=${encodeURIComponent(domain)}`;

    // Set or update og:image
    let ogMeta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    if (!ogMeta) {
      ogMeta = document.createElement("meta");
      ogMeta.setAttribute("property", "og:image");
      document.head.appendChild(ogMeta);
    }
    ogMeta.content = ogUrl;

    // Set og:image:width and height
    const setMeta = (prop: string, val: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", prop);
        document.head.appendChild(el);
      }
      el.content = val;
    };
    setMeta("og:image:width", "1080");
    setMeta("og:image:height", "1080");
    setMeta("og:title", "My Third Way — Aethel Mirror");
    setMeta("og:description", thirdWay.slice(0, 120));

    return () => {
      // Clean up on unmount
      ogMeta?.remove();
      document.querySelector('meta[property="og:image:width"]')?.remove();
      document.querySelector('meta[property="og:image:height"]')?.remove();
    };
  }, [thirdWay, domain]);
};

export default useOgImage;
