import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a pattern recognition engine for a decision clarity tool. Given a reading's domain, question, and Third Way, extract 3-5 memory tags that represent recurring themes, fears, or patterns.

Return valid JSON only:
{
  "tags": [
    {
      "memory_type": "theme" | "pattern" | "recurring_fear" | "recurring_domain" | "gate" | "placement",
      "memory_value": "string (max 5 words, lowercase)"
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { user_id, domain, question, third_way } = await req.json();
    if (!user_id || !domain || !question || !third_way) {
      throw new Error("Missing required fields: user_id, domain, question, third_way");
    }

    const userMessage = `Domain: ${domain}\nQuestion: ${question}\nThird Way: ${third_way}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_memory_tags",
              description: "Extract memory tags from a reading",
              parameters: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        memory_type: {
                          type: "string",
                          enum: ["theme", "pattern", "recurring_fear", "recurring_domain", "gate", "placement"],
                        },
                        memory_value: {
                          type: "string",
                          description: "Max 5 words, lowercase",
                        },
                      },
                      required: ["memory_type", "memory_value"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_memory_tags" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      // Non-critical — silently fail memory extraction
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let tags: Array<{ memory_type: string; memory_value: string }> = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      tags = parsed.tags || [];
    } else {
      // Fallback: try parsing content
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        tags = parsed.tags || [];
      }
    }

    // Upsert each tag: increment frequency if exists, insert if new
    let extracted = 0;
    for (const tag of tags) {
      if (!tag.memory_type || !tag.memory_value) continue;
      const value = tag.memory_value.toLowerCase().slice(0, 100);

      // Check if exists
      const { data: existing } = await sb
        .from("user_memory")
        .select("id, frequency")
        .eq("user_id", user_id)
        .eq("memory_type", tag.memory_type)
        .eq("memory_value", value)
        .maybeSingle();

      if (existing) {
        await sb
          .from("user_memory")
          .update({
            frequency: existing.frequency + 1,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await sb.from("user_memory").insert({
          user_id,
          memory_type: tag.memory_type,
          memory_value: value,
          frequency: 1,
          last_seen_at: new Date().toISOString(),
        });
      }
      extracted++;
    }

    return new Response(JSON.stringify({ extracted, tags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("extract-memory error:", msg);
    return new Response(JSON.stringify({ error: msg, extracted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
