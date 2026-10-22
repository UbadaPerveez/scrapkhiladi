export type FunctionalCondition =
  | "working"
  | "partially_working"
  | "not_working"
  | "intermittent"
  | "unknown";

export type VisibleCondition =
  | "like_new"
  | "good"
  | "fair"
  | "poor"
  | "damaged"
  | "unclear";

export type RecommendedAction =
  | "REPAIR"
  | "REUSE"
  | "DONATE"
  | "RESELL"
  | "RECYCLE"
  | "REPLACE"
  | "SPECIAL_DISPOSAL"
  | "NEEDS_MORE_INFORMATION";

export interface StructuredAnalysis {
  item_type: string;
  broad_category: string;
  brand: string;
  model: string;
  visible_materials: string[];
  visible_condition: VisibleCondition;
  visible_damage: string[];
  functional_condition: FunctionalCondition;
  missing_information: string[];
  needs_more_information: boolean;
  next_question: string | null;
}

export interface EvidenceItem {
  id: string;
  analysis_id: string;
  kind: "image" | "user_answer" | "manual_correction" | "ocr" | "barcode";
  source: "user_upload" | "user_answer" | "ai_inference";
  field: string;
  value: string;
  description: string;
  created_at: string;
}

export interface Recommendation {
  recommended_action: RecommendedAction;
  reason: string;
  supporting_evidence: string[];
  uncertainty: string[];
  alternative_actions: Array<{
    action: RecommendedAction;
    reason: string;
  }>;
  missing_information: string[];
  professional_inspection_recommended: boolean;
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

export interface QuestionOption {
  value: string;
  label: string;
  leads_to?: string | null;
}

export interface Question {
  id: string;
  field: string;
  question: string;
  options: QuestionOption[];
  allow_skip: boolean;
  allow_additional_photo: boolean;
  safety_note?: string | null;
}

export interface QuestionTree {
  [key: string]: Question;
}
