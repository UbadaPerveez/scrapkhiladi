import { createClient } from "@supabase/supabase-js";
import type {
  StructuredAnalysis,
  EvidenceItem,
  Recommendation,
  RecommendedAction,
  FunctionalCondition,
} from "./analysisTypes";

export type {
  StructuredAnalysis,
  EvidenceItem,
  Recommendation,
  RecommendedAction,
  FunctionalCondition,
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/analyze-waste`;

// Legacy types preserved for backward compatibility
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

export interface AnalysisRecord {
  id: string;
  image_data: string | null;
  analysis_json: StructuredAnalysis;
  item_type: string;
  broad_category: string;
  functional_condition: FunctionalCondition;
  visible_condition: string;
  needs_more_information: boolean;
  recommendation_json: Recommendation | null;
  recommended_action: RecommendedAction | null;
  condition_assessment: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

// Existing function preserved for backward compatibility
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

  const analysis = data.analysis as StructuredAnalysis;
  return {
    item_name: analysis.item_type,
    material: analysis.visible_materials.join(", "),
    action: "trash",
    condition_assessment: analysis.visible_condition,
  };
}

// New structured analysis function
export async function analyzeImageStructured(
  imageBase64: string,
  apiKey: string,
  mimeType: string,
): Promise<StructuredAnalysis> {
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
  return data.analysis as StructuredAnalysis;
}

export async function createAnalysisRecord(
  analysis: StructuredAnalysis,
  imageData: string | null,
  latitude: number | null,
  longitude: number | null,
): Promise<AnalysisRecord | null> {
  const { data, error } = await supabase
    .from("item_analyses")
    .insert({
      image_data: imageData,
      analysis_json: analysis,
      item_type: analysis.item_type,
      broad_category: analysis.broad_category,
      functional_condition: analysis.functional_condition,
      visible_condition: analysis.visible_condition,
      needs_more_information: analysis.needs_more_information,
      latitude,
      longitude,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create analysis record:", error);
    return null;
  }
  return data as AnalysisRecord;
}

export async function updateAnalysisRecommendation(
  analysisId: string,
  recommendation: Recommendation,
  conditionAssessment: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("item_analyses")
    .update({
      recommendation_json: recommendation,
      recommended_action: recommendation.recommended_action,
      condition_assessment: conditionAssessment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysisId);

  if (error) {
    console.error("Failed to update analysis recommendation:", error);
    return false;
  }
  return true;
}

export async function addEvidence(
  analysisId: string,
  kind: EvidenceItem["kind"],
  source: EvidenceItem["source"],
  field: string,
  value: string,
  description: string,
): Promise<EvidenceItem | null> {
  const { data, error } = await supabase
    .from("analysis_evidence")
    .insert({
      analysis_id: analysisId,
      kind,
      source,
      field,
      value,
      description,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to add evidence:", error);
    return null;
  }
  return data as EvidenceItem;
}

export async function fetchEvidence(analysisId: string): Promise<EvidenceItem[]> {
  const { data, error } = await supabase
    .from("analysis_evidence")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch evidence:", error);
    return [];
  }
  return (data || []) as EvidenceItem[];
}

// Existing history functions preserved
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
