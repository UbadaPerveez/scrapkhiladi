const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

type FunctionalCondition = "working" | "partially_working" | "not_working" | "intermittent" | "unknown";

interface StructuredAnalysis {
  item_type: string;
  broad_category: string;
  brand: string;
  model: string;
  visible_materials: string[];
  visible_condition: string;
  visible_damage: string[];
  functional_condition: FunctionalCondition;
  missing_information: string[];
  needs_more_information: boolean;
  next_question: string | null;
}

const VALID_FUNCTIONAL_CONDITIONS: FunctionalCondition[] = [
  "working",
  "partially_working",
  "not_working",
  "intermittent",
  "unknown",
];

const SYSTEM_PROMPT = `You are an expert item-condition assessor for a reuse, repair, donation, recycling, and responsible-disposal platform.

Analyze the provided image and return ONLY a strict JSON object with exactly these fields:
{
  "item_type": "string - specific name of the item (e.g. 'washing machine', 'glass bottle', 'smartphone', 'cardboard box')",
  "broad_category": "string - one of: appliance, electronics, furniture, clothing, packaging, container, tool, toy, book, kitchenware, bicycle, sports_equipment, other",
  "brand": "string - brand name if clearly visible and readable on the item, otherwise 'unknown'. Do not guess or invent brand names.",
  "model": "string - model number if clearly visible and readable, otherwise 'unknown'. Do not guess or invent model numbers.",
  "visible_materials": "array of strings - materials visible in the image (e.g. ['plastic', 'metal', 'glass', 'paper', 'fabric', 'wood', 'ceramic', 'rubber'])",
  "visible_condition": "string - one of: 'like_new', 'good', 'fair', 'poor', 'damaged', 'unclear'",
  "visible_damage": "array of strings - visible damage types (e.g. ['cracked_screen', 'dents', 'rust', 'tears', 'missing_parts', 'water_damage']). Empty array if no visible damage.",
  "functional_condition": "string - one of: 'working', 'partially_working', 'not_working', 'intermittent', 'unknown'",
  "missing_information": "array of strings - information needed but not available from the image (e.g. ['functional_test', 'brand_identification', 'internal_condition'])",
  "needs_more_information": "boolean - true if follow-up questions are needed to make a reliable recommendation",
  "next_question": "string or null - the single most important follow-up question for the user, or null if none is needed"
}

CRITICAL RULES:
- A normal exterior image CANNOT establish whether an electronic device, appliance, or machine works internally. You MUST set functional_condition to 'unknown' unless there is clear visible evidence of function or malfunction.
- Never claim a motor, battery, circuit board, or other internal component is faulty without sufficient supporting evidence visible in the image.
- Do not infer that an item is safe merely because no damage is visible.
- Do not invent brand names, model numbers, error codes, or any information not visible in the image.
- If the image is blurry, ambiguous, or insufficient, set visible_condition to 'unclear' and functional_condition to 'unknown'.
- Set needs_more_information to true whenever functional_condition is 'unknown' and the item type could plausibly have a functional aspect (appliances, electronics, tools, vehicles, etc.).
- For items without functional aspects (e.g. glass bottles, cardboard boxes, paper), set functional_condition to 'unknown' and next_question to null.
- Return ONLY the JSON object. No markdown, no extra text, no code fences.`;

function validateAnalysis(raw: unknown): StructuredAnalysis {
  const obj = raw as Record<string, unknown>;
  if (!obj || typeof obj !== "object") {
    throw new Error("Analysis is not a valid object");
  }

  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" ? v : fallback;

  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];

  const functional = str(obj.functional_condition, "unknown");
  const validatedFunctional: FunctionalCondition = VALID_FUNCTIONAL_CONDITIONS.includes(
    functional as FunctionalCondition,
  )
    ? (functional as FunctionalCondition)
    : "unknown";

  const visibleCondition = str(obj.visible_condition, "unclear");
  const validVisibleConditions = ["like_new", "good", "fair", "poor", "damaged", "unclear"];
  const validatedVisible = validVisibleConditions.includes(visibleCondition)
    ? visibleCondition
    : "unclear";

  const needsMoreInfo =
    typeof obj.needs_more_information === "boolean"
      ? obj.needs_more_information
      : validatedFunctional === "unknown" &&
        ["appliance", "electronics", "tool", "bicycle", "sports_equipment", "other"].includes(
          str(obj.broad_category, "other"),
        );

  const nextQuestion =
    typeof obj.next_question === "string" && obj.next_question.length > 0
      ? obj.next_question
      : needsMoreInfo
        ? "Can you provide more information about this item's condition?"
        : null;

  return {
    item_type: str(obj.item_type, "unknown"),
    broad_category: str(obj.broad_category, "other"),
    brand: str(obj.brand, "unknown"),
    model: str(obj.model, "unknown"),
    visible_materials: strArray(obj.visible_materials),
    visible_condition: validatedVisible,
    visible_damage: strArray(obj.visible_damage),
    functional_condition: validatedFunctional,
    missing_information: strArray(obj.missing_information),
    needs_more_information: needsMoreInfo,
    next_question: nextQuestion,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { image_base64, api_key, mime_type } = await req.json();

    if (!image_base64 || !api_key) {
      return new Response(
        JSON.stringify({ error: "Missing image_base64 or api_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${api_key}`;

    const geminiBody = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: mime_type || "image/jpeg",
                data: image_base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    };

    let geminiResponse: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
          signal: AbortSignal.timeout(45000),
        });
      } catch {
        if (attempt === 1) {
          return new Response(
            JSON.stringify({ error: "Gemini is taking too long to respond. Please try scanning again." }),
            { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        continue;
      }

      if (geminiResponse.ok) break;
      if (![429, 500, 502, 503, 504].includes(geminiResponse.status) || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!geminiResponse || !geminiResponse.ok) {
      const status = geminiResponse?.status || 502;
      const errorText = geminiResponse ? await geminiResponse.text() : "";
      const errorMessage = status === 429 || status === 503
        ? "Gemini is temporarily busy. Please try again in a moment."
        : `Gemini API error (${status})`;
      let finalMessage = errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        finalMessage = errorJson.error?.message || errorMessage;
      } catch {
        // use default message
      }
      return new Response(
        JSON.stringify({ error: finalMessage }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData: GeminiResponse = await geminiResponse.json();

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "No response text from Gemini" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response as JSON", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let analysis: StructuredAnalysis;
    try {
      analysis = validateAnalysis(parsed);
    } catch {
      return new Response(
        JSON.stringify({ error: "Gemini response failed validation" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
