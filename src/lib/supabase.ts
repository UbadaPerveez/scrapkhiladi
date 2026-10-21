import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/analyze-waste`;

export interface ScanHistoryEntry {
  id: string;
  item_name: string;
  material: string;
  action: "recycle" | "donate" | "trash" | "hazardous";
  condition_assessment: string;
  image_data: string | null;
  latitude: number | null;
  longitude: number | null;
  saved_from_landfill: boolean;
  created_at: string;
}

export interface WasteAnalysis {
  item_name: string;
  material: string;
  action: "recycle" | "donate" | "trash" | "hazardous";
  condition_assessment: string;
}

export async function analyzeImage(
  imageBase64: string,
  apiKey: string,
  mimeType: string,
): Promise<WasteAnalysis> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      api_key: apiKey,
      mime_type: mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429 || response.status === 503) {
      throw new Error("Gemini is temporarily busy. Please try again in a moment.");
    }
    if (response.status === 504) {
      throw new Error("The scan took too long. Please try again with a clearer or smaller image.");
    }
    throw new Error(errorData.error || `Request failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.analysis) {
    throw new Error("Invalid response from analysis service");
  }
  return data.analysis as WasteAnalysis;
}

export async function saveScanHistory(
  entry: Omit<ScanHistoryEntry, "id" | "created_at">,
): Promise<ScanHistoryEntry | null> {
  const { data, error } = await supabase
    .from("scan_history")
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error("Failed to save scan history:", error);
    return null;
  }
  return data as ScanHistoryEntry;
}

export async function fetchScanHistory(): Promise<ScanHistoryEntry[]> {
  const { data, error } = await supabase
    .from("scan_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch scan history:", error);
    return [];
  }
  return (data || []) as ScanHistoryEntry[];
}

export async function deleteScanEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from("scan_history").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete scan entry:", error);
    return false;
  }
  return true;
}

export async function fetchStats(): Promise<{
  total: number;
  saved: number;
  byAction: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from("scan_history")
    .select("action, saved_from_landfill");

  if (error || !data) {
    return { total: 0, saved: 0, byAction: {} };
  }

  const byAction: Record<string, number> = {};
  let saved = 0;
  for (const row of data) {
    byAction[row.action] = (byAction[row.action] || 0) + 1;
    if (row.saved_from_landfill) saved++;
  }

  return { total: data.length, saved, byAction };
}
