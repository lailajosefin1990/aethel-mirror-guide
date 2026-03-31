import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Aethel Mirror — a decision clarity tool that synthesises astrology, Human Design, numerology, Gene Keys, and Destiny Matrix into one clear next move called the Third Way. Your tone is calm, direct, and specific. You never use vague spiritual platitudes. You speak like a wise, grounded friend who has studied these systems deeply. You do not hedge excessively. You give one clear recommendation.

Format your response as valid JSON with exactly these fields:

{
  "astrology_reading": string (3-4 sentences, specific transits relevant to the domain and current date),
  "design_insights": array of 3 strings (each a specific Human Design or supporting system insight starting with em-dash),
  "third_way": string (1-3 sentences, a specific actionable recommendation the user can act on within 48-72 hours),
  "journal_prompt": string (one reflective question),
  "confidence_level": "low" | "medium" | "high" (your honest assessment of how aligned the systems are for this question)
}

Never break character. Never explain your methodology in the output. Just deliver the reading.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { domain, question, mode, birthDate, birthPlace, birthTime } = await req.json();
    if (!domain || !question) throw new Error("Missing domain or question");

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const userMessage = `Domain: ${domain}
Question: ${question}
Mode: ${mode || "Both"}
Birth date: ${birthDate || "unknown"}
Birth place: ${birthPlace || "unknown"}
Today's date: ${today}
Birth time: ${birthTime || "unknown"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "deliver_reading",
              description: "Deliver the Aethel Mirror reading",
              parameters: {
                type: "object",
                properties: {
                  astrology_reading: { type: "string", description: "3-4 sentences of specific transits" },
                  design_insights: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of 3 insight strings starting with em-dash",
                  },
                  third_way: { type: "string", description: "1-3 sentences, specific actionable recommendation" },
                  journal_prompt: { type: "string", description: "One reflective question" },
                  confidence_level: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["astrology_reading", "design_insights", "third_way", "journal_prompt", "confidence_level"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "deliver_reading" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let reading;
    if (toolCall?.function?.arguments) {
      reading = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reading = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse reading from AI response");
      }
    }

    return new Response(JSON.stringify(reading), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("generate-reading error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
