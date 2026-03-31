import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const thirdWay = url.searchParams.get("text") || "Your Third Way";
    const domain = url.searchParams.get("domain") || "AETHEL MIRROR";

    // Escape for SVG
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Word wrap for SVG (~40 chars per line max)
    const words = thirdWay.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (test.length > 42 && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    const displayLines = lines.slice(0, 4);
    if (lines.length > 4) {
      displayLines[3] = displayLines[3].slice(0, -3) + "...";
    }

    const lineHeight = 62;
    const totalHeight = displayLines.length * lineHeight;
    const startY = (1080 - totalHeight) / 2 + 16;

    const textLines = displayLines
      .map((l, i) => `<text x="540" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Georgia, serif" font-size="46" font-weight="500" fill="#F5F0E8">${esc(l)}</text>`)
      .join("\n");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#0A0E1A"/>
  <rect x="24" y="24" width="1032" height="1032" fill="none" stroke="#C9A84C" stroke-width="1"/>
  <text x="540" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#C9A84C" letter-spacing="10">A E T H E L   M I R R O R</text>
  ${textLines}
  <text x="60" y="1020" font-family="system-ui, sans-serif" font-size="18" fill="#C9A84C" letter-spacing="2">${esc(domain.toUpperCase())}</text>
  <text x="1020" y="1020" text-anchor="end" font-family="system-ui, sans-serif" font-size="16" fill="#F5F0E880">aethelmirror.com</text>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
