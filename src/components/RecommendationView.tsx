import type { Recommendation, StructuredAnalysis, EvidenceItem } from "@/lib/analysisTypes";
import { ACTION_CONFIG } from "@/lib/constants";
import {
  Recycle,
  Heart,
  Trash2,
  AlertTriangle,
  MapPin,
  Loader2,
  Wrench,
  RefreshCw,
  TrendingUp,
  Package,
  HelpCircle,
  ShoppingCart,
  ShieldAlert,
} from "lucide-react";

interface RecommendationViewProps {
  analysis: StructuredAnalysis;
  recommendation: Recommendation;
  evidence: EvidenceItem[];
  imageData: string;
  onFindLocations: () => void;
  onScanAgain: () => void;
  onAnswerMore: () => void;
  loadingMap: boolean;
}

function actionIcon(action: string) {
  switch (action) {
    case "REPAIR": return <Wrench className="w-6 h-6" />;
    case "REUSE": return <RefreshCw className="w-6 h-6" />;
    case "DONATE": return <Heart className="w-6 h-6" />;
    case "RESELL": return <TrendingUp className="w-6 h-6" />;
    case "RECYCLE": return <Recycle className="w-6 h-6" />;
    case "REPLACE": return <ShoppingCart className="w-6 h-6" />;
    case "SPECIAL_DISPOSAL": return <ShieldAlert className="w-6 h-6" />;
    case "NEEDS_MORE_INFORMATION": return <HelpCircle className="w-6 h-6" />;
    default: return <Package className="w-6 h-6" />;
  }
}

function actionConfig(action: string) {
  const map: Record<string, { label: string; color: string; bgColor: string }> = {
    REPAIR: { label: "Repair", color: "text-teal-700", bgColor: "bg-teal-50" },
    REUSE: { label: "Reuse", color: "text-emerald-700", bgColor: "bg-emerald-50" },
    DONATE: { label: "Donate", color: "text-blue-700", bgColor: "bg-blue-50" },
    RESELL: { label: "Resell", color: "text-indigo-700", bgColor: "bg-indigo-50" },
    RECYCLE: { label: "Recycle", color: "text-emerald-700", bgColor: "bg-emerald-50" },
    REPLACE: { label: "Replace", color: "text-amber-700", bgColor: "bg-amber-50" },
    SPECIAL_DISPOSAL: { label: "Special Disposal", color: "text-red-700", bgColor: "bg-red-50" },
    NEEDS_MORE_INFORMATION: { label: "More Info Needed", color: "text-gray-700", bgColor: "bg-gray-100" },
  };
  return map[action] || { label: action, color: "text-gray-700", bgColor: "bg-gray-100" };
}

export default function RecommendationView({
  analysis,
  recommendation,
  evidence,
  imageData,
  onFindLocations,
  onScanAgain,
  onAnswerMore,
  loadingMap,
}: RecommendationViewProps) {
  const config = actionConfig(recommendation.recommended_action);
  const showMapButton = ["RECYCLE", "DONATE", "SPECIAL_DISPOSAL"].includes(
    recommendation.recommended_action,
  );
  const showAnswerMore = recommendation.recommended_action === "NEEDS_MORE_INFORMATION";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-3xl overflow-hidden h-48 bg-gray-100">
        <img src={imageData} alt={analysis.item_type} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <span className="text-white font-semibold text-lg drop-shadow-lg">{analysis.item_type}</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color} font-bold text-sm shadow-lg`}>
            {actionIcon(recommendation.recommended_action)}
            {config.label}
          </div>
        </div>
      </div>

      {/* Main recommendation card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Recommendation</p>
        <p className="text-sm text-gray-700 leading-relaxed">{recommendation.reason}</p>
      </div>

      {/* Item details */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Category</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{analysis.broad_category}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Materials</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {analysis.visible_materials.length > 0
                ? analysis.visible_materials.join(", ")
                : "Not identified"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Brand</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{analysis.brand}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Model</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{analysis.model}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Visible Condition</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">
              {analysis.visible_condition.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Function</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">
              {analysis.functional_condition.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {analysis.visible_damage.length > 0 && (
          <div className="pt-3 border-t border-gray-100 mb-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Visible Damage</p>
            <div className="flex flex-wrap gap-2">
              {analysis.visible_damage.map((d, i) => (
                <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full capitalize">
                  {d.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evidence summary */}
      {recommendation.supporting_evidence.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Supporting Evidence</p>
          <ul className="space-y-1.5">
            {recommendation.supporting_evidence.map((e, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uncertainty */}
      {recommendation.uncertainty.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-2">Uncertainty</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.uncertainty.map((u, i) => (
              <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full capitalize">
                {u.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Professional inspection warning */}
      {recommendation.professional_inspection_recommended && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Professional Inspection Recommended</p>
            <p className="text-xs text-orange-700 mt-1 leading-relaxed">
              This item may require diagnosis by a qualified technician. Do not attempt internal repairs yourself,
              especially on mains-powered appliances or devices with batteries.
            </p>
          </div>
        </div>
      )}

      {/* Alternatives */}
      {recommendation.alternative_actions.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Alternatives</p>
          <div className="space-y-2">
            {recommendation.alternative_actions.map((alt, i) => {
              const altConfig = actionConfig(alt.action);
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${altConfig.bgColor} ${altConfig.color} flex-shrink-0`}>
                    {altConfig.label}
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed">{alt.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User answers summary */}
      {evidence.filter((e) => e.source === "user_answer").length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Your Answers</p>
          <div className="space-y-1.5">
            {evidence
              .filter((e) => e.source === "user_answer")
              .map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-medium capitalize">{e.field.replace(/_/g, " ")}:</span>
                  <span className="text-gray-700">{e.description}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onScanAgain}
          className="flex-1 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          Scan Again
        </button>
        {showAnswerMore && (
          <button
            onClick={onAnswerMore}
            className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all active:scale-[0.98] shadow-lg shadow-teal-600/20"
          >
            Answer Questions
          </button>
        )}
        {showMapButton && (
          <button
            onClick={onFindLocations}
            disabled={loadingMap}
            className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-semibold transition-all active:scale-[0.98] shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
          >
            {loadingMap ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                Find Drop-off
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
