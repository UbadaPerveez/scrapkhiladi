import { useState } from "react";
import type { Question, EvidenceItem } from "@/lib/analysisTypes";
import { Camera, ChevronRight, X, AlertTriangle, Loader2 } from "lucide-react";

interface InspectionFlowProps {
  questions: Question[];
  existingEvidence: EvidenceItem[];
  onSubmitAnswer: (field: string, value: string, description: string, additionalPhoto?: string) => void;
  onSkip: (field: string) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export default function InspectionFlow({
  questions,
  existingEvidence,
  onSubmitAnswer,
  onSkip,
  onComplete,
  onCancel,
}: InspectionFlowProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [additionalPhoto, setAdditionalPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentIdx];
  const answeredFields = new Set(existingEvidence.map((e) => e.field));

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
          <ChevronRight className="w-8 h-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Assessment Complete</h3>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          All available questions have been answered. You can now get your recommendation.
        </p>
        <button
          onClick={onComplete}
          className="w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold transition-all active:scale-[0.98] shadow-lg shadow-teal-600/20"
        >
          Get Recommendation
        </button>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAdditionalPhoto(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!selectedValue && !currentQuestion.allow_skip) return;
    setSubmitting(true);
    const option = currentQuestion.options.find((o) => o.value === selectedValue);
    const description = option?.label || "Skipped";
    onSubmitAnswer(
      currentQuestion.field,
      selectedValue || "skipped",
      description,
      additionalPhoto || undefined,
    );
    setSubmitting(false);
    setSelectedValue("");
    setAdditionalPhoto(null);
    if (currentIdx + 1 >= questions.length) {
      onComplete();
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleSkip = () => {
    onSkip(currentQuestion.field);
    setSelectedValue("");
    setAdditionalPhoto(null);
    if (currentIdx + 1 >= questions.length) {
      onComplete();
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Quick Questions</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Step {currentIdx + 1} of {questions.length}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {answeredFields.has(currentQuestion.field) && (
        <div className="bg-teal-50 rounded-xl p-3 text-xs text-teal-700">
          You already answered this question. Providing a new answer will update it.
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-sm font-semibold text-gray-900 mb-3">{currentQuestion.question}</p>

        {currentQuestion.safety_note && (
          <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{currentQuestion.safety_note}</p>
          </div>
        )}

        <div className="space-y-2">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedValue(option.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                selectedValue === option.value
                  ? "border-teal-500 bg-teal-50 text-teal-900 font-semibold"
                  : "border-gray-100 hover:border-gray-200 text-gray-700"
              }`}
            >
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>

        {currentQuestion.allow_additional_photo && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium">Optional: Add another photo</p>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors w-fit">
              <Camera className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700 font-medium">
                {additionalPhoto ? "Photo added" : "Upload photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            {additionalPhoto && (
              <div className="mt-2 rounded-xl overflow-hidden w-20 h-20">
                <img src={additionalPhoto} alt="Evidence" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {currentQuestion.allow_skip && (
          <button
            onClick={handleSkip}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all active:scale-[0.98]"
          >
            Skip
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!selectedValue || submitting}
          className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Next
        </button>
      </div>
    </div>
  );
}
