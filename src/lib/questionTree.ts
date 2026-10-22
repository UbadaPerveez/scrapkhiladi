import type { StructuredAnalysis, EvidenceItem, QuestionTree, Question } from "./analysisTypes";

const APPLIANCE_SYMPTOMS_QUESTION = "What problem are you experiencing?";

const APPLIANCE_DRAINAGE_FOLLOWUP =
  "Is there standing water inside the machine, and do you see any error code on the display?";

const APPLIANCE_NO_POWER_FOLLOWUP =
  "Have you checked that the power outlet works and the power cable is not damaged?";

const APPLIANCE_DRUM_FOLLOWUP =
  "Can you hear the motor running when a cycle starts, or is there complete silence?";

const APPLIANCE_LEAK_FOLLOWUP =
  "Where is the water leaking from — the door seal, the back, or underneath the machine?";

const APPLIANCE_NOISE_FOLLOWUP =
  "When does the unusual noise occur — during filling, spinning, or draining?";

const ELECTRONICS_SCREEN_QUESTION =
  "Aside from the visible screen damage, does the device still turn on and respond to input?";

const ELECTRONICS_BATTERY_QUESTION =
  "Have you noticed any battery swelling, overheating, or failure to hold a charge?";

const GENERAL_FUNCTION_QUESTION =
  "Does the item currently work as intended, or is there a specific problem?";

const FURNITURE_DAMAGE_QUESTION =
  "Is the structural integrity of the item affected, or is the damage purely cosmetic?";

const CLOTHING_CONDITION_QUESTION =
  "Are there any stains, tears, or signs of wear beyond what is visible in the image?";

export const QUESTION_TREE: QuestionTree = {
  appliance_symptom: {
    id: "appliance_symptom",
    field: "reported_symptom",
    question: APPLIANCE_SYMPTOMS_QUESTION,
    allow_skip: true,
    allow_additional_photo: true,
    options: [
      { value: "does_not_turn_on", label: "Does not turn on", leads_to: "appliance_no_power" },
      { value: "does_not_drain", label: "Does not drain water", leads_to: "appliance_drainage" },
      { value: "drum_does_not_spin", label: "Drum does not spin", leads_to: "appliance_drum" },
      { value: "water_leaking", label: "Water is leaking", leads_to: "appliance_leak" },
      { value: "unusual_noise", label: "Makes unusual noise", leads_to: "appliance_noise" },
      { value: "works_normally", label: "Works normally", leads_to: null },
      { value: "other_not_sure", label: "Other / not sure", leads_to: "general_function" },
    ],
  },
  appliance_drainage: {
    id: "appliance_drainage",
    field: "drainage_detail",
    question: APPLIANCE_DRAINAGE_FOLLOWUP,
    allow_skip: true,
    allow_additional_photo: true,
    options: [
      { value: "standing_water_yes_error_yes", label: "Standing water and error code visible", leads_to: null },
      { value: "standing_water_yes_error_no", label: "Standing water but no error code", leads_to: null },
      { value: "standing_water_no_error_yes", label: "No standing water but error code visible", leads_to: null },
      { value: "standing_water_no_error_no", label: "No standing water and no error code", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  appliance_no_power: {
    id: "appliance_no_power",
    field: "power_detail",
    question: APPLIANCE_NO_POWER_FOLLOWUP,
    allow_skip: true,
    allow_additional_photo: false,
    safety_note:
      "Do not open the appliance or touch internal wiring. A qualified technician should inspect internal power components.",
    options: [
      { value: "outlet_works_cable_ok", label: "Outlet works and cable looks fine", leads_to: null },
      { value: "outlet_works_cable_damaged", label: "Outlet works but cable is damaged", leads_to: null },
      { value: "outlet_not_checked", label: "Have not checked the outlet yet", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  appliance_drum: {
    id: "appliance_drum",
    field: "drum_detail",
    question: APPLIANCE_DRUM_FOLLOWUP,
    allow_skip: true,
    allow_additional_photo: false,
    options: [
      { value: "motor_sound_yes", label: "Motor makes sound but drum does not move", leads_to: null },
      { value: "complete_silence", label: "Complete silence when cycle starts", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  appliance_leak: {
    id: "appliance_leak",
    field: "leak_detail",
    question: APPLIANCE_LEAK_FOLLOWUP,
    allow_skip: true,
    allow_additional_photo: true,
    options: [
      { value: "door_seal", label: "Leaking from the door seal", leads_to: null },
      { value: "back", label: "Leaking from the back", leads_to: null },
      { value: "underneath", label: "Leaking from underneath", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  appliance_noise: {
    id: "appliance_noise",
    field: "noise_detail",
    question: APPLIANCE_NOISE_FOLLOWUP,
    allow_skip: true,
    allow_additional_photo: false,
    options: [
      { value: "during_filling", label: "During filling", leads_to: null },
      { value: "during_spinning", label: "During spinning", leads_to: null },
      { value: "during_draining", label: "During draining", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  electronics_screen: {
    id: "electronics_screen",
    field: "device_function",
    question: ELECTRONICS_SCREEN_QUESTION,
    allow_skip: true,
    allow_additional_photo: false,
    options: [
      { value: "turns_on_responds", label: "Yes, it turns on and responds", leads_to: null },
      { value: "turns_on_no_respond", label: "Turns on but does not respond", leads_to: null },
      { value: "does_not_turn_on", label: "Does not turn on", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  electronics_battery: {
    id: "electronics_battery",
    field: "battery_condition",
    question: ELECTRONICS_BATTERY_QUESTION,
    allow_skip: true,
    allow_additional_photo: false,
    safety_note:
      "If you notice swelling, stop using the device immediately and do not attempt to charge it. A swollen battery requires professional handling.",
    options: [
      { value: "swelling_visible", label: "Visible swelling", leads_to: null },
      { value: "overheating", label: "Overheating during use", leads_to: null },
      { value: "no_hold_charge", label: "Does not hold a charge", leads_to: null },
      { value: "no_battery_issue", label: "No battery issues noticed", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  general_function: {
    id: "general_function",
    field: "general_function",
    question: GENERAL_FUNCTION_QUESTION,
    allow_skip: true,
    allow_additional_photo: true,
    options: [
      { value: "works_as_intended", label: "Works as intended", leads_to: null },
      { value: "partially_works", label: "Partially works", leads_to: null },
      { value: "does_not_work", label: "Does not work", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  furniture_damage: {
    id: "furniture_damage",
    field: "structural_integrity",
    question: FURNITURE_DAMAGE_QUESTION,
    allow_skip: true,
    allow_additional_photo: true,
    options: [
      { value: "structural_damage", label: "Structural integrity is affected", leads_to: null },
      { value: "cosmetic_only", label: "Damage is purely cosmetic", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
  clothing_condition: {
    id: "clothing_condition",
    field: "clothing_detail",
    question: CLOTHING_CONDITION_QUESTION,
    allow_skip: true,
    allow_additional_photo: true,
    options: [
      { value: "no_additional_damage", label: "No additional stains or tears", leads_to: null },
      { value: "has_stains", label: "Has stains not visible in image", leads_to: null },
      { value: "has_tears", label: "Has tears or holes not visible in image", leads_to: null },
      { value: "dont_know", label: "I don't know", leads_to: null },
    ],
  },
};

export function getInitialQuestion(
  analysis: StructuredAnalysis,
  answeredFields: Set<string>,
): Question | null {
  if (!analysis.needs_more_information) return null;

  const category = analysis.broad_category;

  if (category === "appliance") {
    if (!answeredFields.has("reported_symptom")) {
      return QUESTION_TREE.appliance_symptom;
    }
  }

  if (category === "electronics") {
    const hasScreenDamage = analysis.visible_damage.some((d) =>
      d.includes("cracked") || d.includes("screen"),
    );
    if (hasScreenDamage && !answeredFields.has("device_function")) {
      return QUESTION_TREE.electronics_screen;
    }
    if (!answeredFields.has("battery_condition")) {
      return QUESTION_TREE.electronics_battery;
    }
  }

  if (category === "furniture") {
    if (analysis.visible_damage.length > 0 && !answeredFields.has("structural_integrity")) {
      return QUESTION_TREE.furniture_damage;
    }
  }

  if (category === "clothing") {
    if (!answeredFields.has("clothing_detail")) {
      return QUESTION_TREE.clothing_condition;
    }
  }

  if (!answeredFields.has("general_function")) {
    return QUESTION_TREE.general_function;
  }

  return null;
}

export function getNextQuestion(
  currentQuestionId: string,
  selectedValue: string,
  analysis: StructuredAnalysis,
  answeredFields: Set<string>,
): Question | null {
  const current = QUESTION_TREE[currentQuestionId];
  if (!current) return null;

  const selectedOption = current.options.find((o) => o.value === selectedValue);
  const leadsTo = selectedOption?.leads_to;

  if (leadsTo && QUESTION_TREE[leadsTo]) {
    return QUESTION_TREE[leadsTo];
  }

  return getInitialQuestion(analysis, answeredFields);
}

export function mapUserAnswerToFunctionalCondition(
  field: string,
  value: string,
): import("./analysisTypes").FunctionalCondition | null {
  if (field === "reported_symptom") {
    if (value === "works_normally") return "working";
    if (value === "other_not_sure") return null;
    return "not_working";
  }

  if (field === "general_function") {
    if (value === "works_as_intended") return "working";
    if (value === "partially_works") return "partially_working";
    if (value === "does_not_work") return "not_working";
    return "unknown";
  }

  if (field === "device_function") {
    if (value === "turns_on_responds") return "working";
    if (value === "turns_on_no_respond") return "partially_working";
    if (value === "does_not_turn_on") return "not_working";
    return "unknown";
  }

  if (field === "structural_integrity") {
    if (value === "cosmetic_only") return "working";
    if (value === "structural_damage") return "not_working";
    return "unknown";
  }

  return null;
}

export function getSafetyConcerns(analysis: StructuredAnalysis, evidence: EvidenceItem[]): string[] {
  const concerns: string[] = [];

  const hasBatterySwelling = evidence.some(
    (e) => e.field === "battery_condition" && e.value === "swelling_visible",
  );
  if (hasBatterySwelling) {
    concerns.push("swollen_battery");
  }

  const hasPowerDamage = analysis.visible_damage.some(
    (d) => d.includes("cable") || d.includes("cord") || d.includes("wiring"),
  );
  if (hasPowerDamage) {
    concerns.push("exposed_wiring");
  }

  const hasHazardousMaterials = analysis.visible_materials.some((m) =>
    ["chemical", "battery", "paint", "mercury", "asbestos"].includes(m.toLowerCase()),
  );
  if (hasHazardousMaterials) {
    concerns.push("hazardous_material");
  }

  const categoryHasMainsPower = ["appliance", "electronics"].includes(analysis.broad_category);
  const evidenceIndicatesInternalIssue = evidence.some(
    (e) =>
      e.field === "reported_symptom" &&
      ["does_not_turn_on", "does_not_drain", "drum_does_not_spin"].includes(e.value),
  );
  if (categoryHasMainsPower && evidenceIndicatesInternalIssue) {
    concerns.push("mains_power_internal_diagnostic");
  }

  return concerns;
}
