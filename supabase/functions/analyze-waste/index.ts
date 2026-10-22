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

interface WasteAnalysis {
  item_name: string;
  material: string;
  action: "recycle" | "donate" | "trash" | "hazardous";
  condition_assessment: string;
}

const SYSTEM_PROMPT = `You are a waste-sorting expert assistant. Analyze the provided image of a waste item and return ONLY a strict JSON object with exactly these fields:
{
  "item_name": "string - the name of the item shown in the image",
  "material": "string - the primary material(s) the item is made of (e.g. plastic, paper, glass, metal, organic, electronic, textile)",
  "action": "recycle" | "donate" | "trash" | "hazardous",
  "condition_assessment": "string - brief assessment of the item's condition and why the action was chosen"
}

Rules:
- "action" must be exactly one of: "recycle", "donate", "trash", "hazardous"
- Use "recycle" for items that can be processed and reused (clean plastics, paper, glass, metal)
- Use "donate" for items in good condition that could be reused by others (clothing, working electronics, books, furniture)
- Use "trash" for items that cannot be recycled or donated and belong in general waste
- Use "hazardous" for items requiring special disposal (batteries, chemicals, paint, electronics with components, medical waste)
- Return ONLY the JSON object, no markdown, no extra text, no code fences`;

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
        maxOutputTokens: 512,
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
      let errorMessage = status === 429 || status === 503
        ? "Gemini is temporarily busy. Please try again in a moment."
        : `Gemini API error (${status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // use default message
      }
      return new Response(
        JSON.stringify({ error: errorMessage }),
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

    let analysis: WasteAnalysis;
    try {
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response as JSON", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validActions = ["recycle", "donate", "trash", "hazardous"];
    if (!validActions.includes(analysis.action)) {
      analysis.action = "trash";
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
