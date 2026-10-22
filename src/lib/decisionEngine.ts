import type {
  StructuredAnalysis,
  EvidenceItem,
  Recommendation,
  RecommendedAction,
} from "./analysisTypes";
import { getSafetyConcerns } from "./questionTree";

const HAZARDOUS_CATEGORIES = new Set(["hazardous", "chemical", "battery", "medical"]);
const HAZARDOUS_MATERIALS = new Set(["battery", "chemical", "paint", "mercury", "asbestos", "lead"]);

const GOOD_VISIBLE_CONDITIONS = new Set(["like_new", "good"]);
const FAIR_VISIBLE_CONDITIONS = new Set(["fair"]);
const POOR_VISIBLE_CONDITIONS = new Set(["poor", "damaged"]);

const REPAIRABLE_CATEGORIES = new Set(["appliance", "electronics", "tool", "bicycle", "furniture"]);

const DONATABLE_CATEGORIES = new Set(["clothing", "furniture", "book", "toy", "sports_equipment"]);
const RESELLABLE_CATEGORIES = new Set(["electronics", "appliance", "bicycle", "tool", "furniture"]);

const RECYCLABLE_MATERIALS = new Set([
  "glass",
  "metal",
  "aluminum",
  "steel",
  "paper",
  "cardboard",
  "plastic",
  "wood",
]);

const SPECIAL_DISPOSAL_MATERIALS = new Set([
  "battery",
  "chemical",
  "paint",
  "mercury",
  "asbestos",
  "lead",
  "electronic",
]);

function hasEvidenceForFunctional(analysis: StructuredAnalysis, evidence: EvidenceItem[]): boolean {
  if (analysis.functional_condition !== "unknown") return true;

  const functionalEvidence = evidence.filter(
    (e) =>
      e.field === "reported_symptom" ||
      e.field === "general_function" ||
      e.field === "device_function" ||
      e.field === "structural_integrity",
  );

  return functionalEvidence.some(
    (e) => e.value !== "dont_know" && e.value !== "other_not_sure" && e.value !== "",
  );
}

function getResolvedFunctionalCondition(
  analysis: StructuredAnalysis,
  evidence: EvidenceItem[],
): import("./analysisTypes").FunctionalCondition {
  if (analysis.functional_condition !== "unknown") return analysis.functional_condition;

  for (const e of evidence) {
    if (e.field === "reported_symptom") {
      if (e.value === "works_normally") return "working";
      if (e.value === "other_not_sure") continue;
      return "not_working";
    }
    if (e.field === "general_function") {
      if (e.value === "works_as_intended") return "working";
      if (e.value === "partially_works") return "partially_working";
      if (e.value === "does_not_work") return "not_working";
    }
    if (e.field === "device_function") {
      if (e.value === "turns_on_responds") return "working";
      if (e.value === "turns_on_no_respond") return "partially_working";
      if (e.value === "does_not_turn_on") return "not_working";
    }
    if (e.field === "structural_integrity") {
      if (e.value === "cosmetic_only") return "working";
      if (e.value === "structural_damage") return "not_working";
    }
  }

  return "unknown";
}

function buildSupportingEvidence(
  analysis: StructuredAnalysis,
  evidence: EvidenceItem[],
): string[] {
  const support: string[] = [];

  support.push(`Image analysis identified: ${analysis.item_type} (${analysis.broad_category})`);

  if (analysis.visible_condition !== "unclear") {
    support.push(`Visible condition: ${analysis.visible_condition}`);
  }

  if (analysis.visible_damage.length > 0) {
    support.push(`Visible damage: ${analysis.visible_damage.join(", ")}`);
  }

  if (analysis.visible_materials.length > 0) {
    support.push(`Visible materials: ${analysis.visible_materials.join(", ")}`);
  }

  const userAnswers = evidence.filter((e) => e.source === "user_answer");
  for (const ans of userAnswers) {
    support.push(`User reported (${ans.field}): ${ans.value}`);
  }

  return support;
}

function buildUncertainty(
  analysis: StructuredAnalysis,
  evidence: EvidenceItem[],
): string[] {
  const uncertainties: string[] = [];

  if (analysis.functional_condition === "unknown" && !hasEvidenceForFunctional(analysis, evidence)) {
    uncertainties.push("functional_condition");
  }

  if (analysis.brand === "unknown") {
    uncertainties.push("brand_identification");
  }

  if (analysis.visible_condition === "unclear") {
    uncertainties.push("image_quality");
  }

  const hasDontKnow = evidence.some(
    (e) => e.value === "dont_know" || e.value === "other_not_sure",
  );
  if (hasDontKnow) {
    uncertainties.push("incomplete_user_answers");
  }

  return uncertainties;
}

function buildMissingInfo(
  analysis: StructuredAnalysis,
  evidence: EvidenceItem[],
): string[] {
  const missing: string[] = [...analysis.missing_information];

  const answeredFields = new Set(evidence.filter((e) => e.source === "user_answer").map((e) => e.field));
  for (const m of missing) {
    if (answeredFields.has(m)) {
      const idx = missing.indexOf(m);
      if (idx >= 0) missing.splice(idx, 1);
    }
  }

  if (
    analysis.functional_condition === "unknown" &&
    !hasEvidenceForFunctional(analysis, evidence) &&
    !missing.includes("functional_condition")
  ) {
    missing.push("functional_condition");
  }

  return missing;
}

export function generateRecommendation(
  analysis: StructuredAnalysis,
  evidence: EvidenceItem[],
): Recommendation {
  const safetyConcerns = getSafetyConcerns(analysis, evidence);
  const functionalCondition = getResolvedFunctionalCondition(analysis, evidence);
  const supportingEvidence = buildSupportingEvidence(analysis, evidence);
  const uncertainty = buildUncertainty(analysis, evidence);
  const missingInfo = buildMissingInfo(analysis, evidence);

  const alternatives: Array<{ action: RecommendedAction; reason: string }> = [];
  const professionalInspectionRecommended =
    safetyConcerns.length > 0 ||
    (REPAIRABLE_CATEGORIES.has(analysis.broad_category) &&
      functionalCondition === "not_working" &&
      analysis.visible_condition !== "damaged");

  // Safety priority
  if (safetyConcerns.includes("swollen_battery")) {
    return {
      recommended_action: "SPECIAL_DISPOSAL",
      reason:
        "A swollen battery is a safety hazard. Stop using the device and do not attempt to charge it. Take it to a facility that handles swollen or damaged batteries.",
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: [],
      missing_information: missingInfo,
      professional_inspection_recommended: true,
    };
  }

  if (safetyConcerns.includes("exposed_wiring") || safetyConcerns.includes("hazardous_material")) {
    return {
      recommended_action: "SPECIAL_DISPOSAL",
      reason:
        "This item may contain hazardous materials or exposed wiring. Do not attempt to use or disassemble it. Take it to a hazardous waste or e-waste facility for safe handling.",
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: [],
      missing_information: missingInfo,
      professional_inspection_recommended: true,
    };
  }

  // Check if we need more information before deciding
  if (
    functionalCondition === "unknown" &&
    REPAIRABLE_CATEGORIES.has(analysis.broad_category) &&
    analysis.visible_condition !== "damaged" &&
    !hasEvidenceForFunctional(analysis, evidence)
  ) {
    return {
      recommended_action: "NEEDS_MORE_INFORMATION",
      reason:
        "The item's functional condition could not be determined from the image alone. Without knowing whether it works, a reliable recommendation cannot be made. Please answer the follow-up questions or provide additional photos.",
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: [],
      missing_information: missingInfo,
      professional_inspection_recommended: false,
    };
  }

  // Decision logic for items with known functional condition
  const visibleGood = GOOD_VISIBLE_CONDITIONS.has(analysis.visible_condition);
  const visibleFair = FAIR_VISIBLE_CONDITIONS.has(analysis.visible_condition);
  const visiblePoor = POOR_VISIBLE_CONDITIONS.has(analysis.visible_condition);
  const hasRecyclableMaterials = analysis.visible_materials.some((m) =>
    RECYCLABLE_MATERIALS.has(m.toLowerCase()),
  );
  const hasSpecialDisposalMaterials = analysis.visible_materials.some((m) =>
    SPECIAL_DISPOSAL_MATERIALS.has(m.toLowerCase()),
  );

  // Working + good condition → donate or resell
  if (functionalCondition === "working" && (visibleGood || visibleFair)) {
    if (DONATABLE_CATEGORIES.has(analysis.broad_category)) {
      if (RESELLABLE_CATEGORIES.has(analysis.broad_category)) {
        alternatives.push({
          action: "RESELL",
          reason: "This item may also be resold if you prefer that over donation.",
        });
      }
      return {
        recommended_action: "DONATE",
        reason: `The ${analysis.item_type} appears to be in ${analysis.visible_condition} condition and is reported to be working. It is a good candidate for donation.`,
        supporting_evidence: supportingEvidence,
        uncertainty,
        alternative_actions: alternatives,
        missing_information: missingInfo,
        professional_inspection_recommended: false,
      };
    }

    if (RESELLABLE_CATEGORIES.has(analysis.broad_category)) {
      alternatives.push({
        action: "DONATE",
        reason: "This item could also be donated to a charitable organization.",
      });
      return {
        recommended_action: "RESELL",
        reason: `The ${analysis.item_type} appears to be in ${analysis.visible_condition} condition and is reported to be working. It has resale value.`,
        supporting_evidence: supportingEvidence,
        uncertainty,
        alternative_actions: alternatives,
        missing_information: missingInfo,
        professional_inspection_recommended: false,
      };
    }

    return {
      recommended_action: "REUSE",
      reason: `The ${analysis.item_type} is in ${analysis.visible_condition} condition and appears functional. Consider reusing it or giving it to someone who can.`,
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: [],
      missing_information: missingInfo,
      professional_inspection_recommended: false,
    };
  }

  // Not working + repairable category → repair
  if (
    (functionalCondition === "not_working" || functionalCondition === "intermittent") &&
    REPAIRABLE_CATEGORIES.has(analysis.broad_category)
  ) {
    if (visiblePoor) {
      alternatives.push({
        action: "RECYCLE",
        reason: "If repair is not economically viable, recycle the item at an appropriate facility.",
      });
    }
    return {
      recommended_action: "REPAIR",
      reason: `The ${analysis.item_type} is reported to have a functional issue, but it belongs to a repairable category. Consider having it inspected and repaired by a qualified technician before considering replacement.`,
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: alternatives,
      missing_information: missingInfo,
      professional_inspection_recommended: professionalInspectionRecommended,
    };
  }

  // Partially working → repair with caution
  if (
    functionalCondition === "partially_working" &&
    REPAIRABLE_CATEGORIES.has(analysis.broad_category)
  ) {
    return {
      recommended_action: "REPAIR",
      reason: `The ${analysis.item_type} is partially working. A technician may be able to diagnose and fix the remaining issue, extending the item's useful life.`,
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: [
        {
          action: "RECYCLE",
          reason: "If repair is not viable, recycle the item at an appropriate facility.",
        },
      ],
      missing_information: missingInfo,
      professional_inspection_recommended: true,
    };
  }

  // Damaged + not working + not repairable → recycle or special disposal
  if (hasSpecialDisposalMaterials || HAZARDOUS_CATEGORIES.has(analysis.broad_category)) {
    return {
      recommended_action: "SPECIAL_DISPOSAL",
      reason: `The ${analysis.item_type} contains materials that require special disposal. Do not place it in regular waste. Take it to a designated e-waste or hazardous waste facility.`,
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: [],
      missing_information: missingInfo,
      professional_inspection_recommended: false,
    };
  }

  if (hasRecyclableMaterials) {
    return {
      recommended_action: "RECYCLE",
      reason: `The ${analysis.item_type} contains recyclable materials (${analysis.visible_materials.join(", ")}). Place it in the appropriate recycling stream or take it to a recycling facility.`,
      supporting_evidence: supportingEvidence,
      uncertainty,
      alternative_actions: visiblePoor
        ? [{ action: "REPLACE", reason: "If you need a replacement, consider a more durable or repairable alternative." }]
        : [],
      missing_information: missingInfo,
      professional_inspection_recommended: false,
    };
  }

  // Fallback: trash
  return {
    recommended_action: "RECYCLE",
    reason: `The ${analysis.item_type} does not clearly fit repair, donation, or special disposal. Check local recycling guidelines for ${analysis.visible_materials.join(", ") || "this material type"}.`,
    supporting_evidence: supportingEvidence,
    uncertainty,
    alternative_actions: [],
    missing_information: missingInfo,
    professional_inspection_recommended: false,
  };
}

// Compatibility mapping for the existing scan_history table
const ACTION_COMPAT_MAP: Record<RecommendedAction, "recycle" | "donate" | "trash" | "hazardous"> = {
  REPAIR: "recycle",
  REUSE: "donate",
  DONATE: "donate",
  RESELL: "donate",
  RECYCLE: "recycle",
  REPLACE: "recycle",
  SPECIAL_DISPOSAL: "hazardous",
  NEEDS_MORE_INFORMATION: "trash",
};

export function mapActionForLegacyTable(
  action: RecommendedAction,
): "recycle" | "donate" | "trash" | "hazardous" {
  return ACTION_COMPAT_MAP[action] || "trash";
}
