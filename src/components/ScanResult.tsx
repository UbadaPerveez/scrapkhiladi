import { useState } from "react";
import { WasteAnalysis } from "@/lib/supabase";
import { ACTION_CONFIG } from "@/lib/constants";
import { Recycle, Heart, Trash2, AlertTriangle, MapPin, X, Check, Loader2 } from "lucide-react";

interface ScanResultProps {
  result: WasteAnalysis;
  imageData: string;
  onFindLocations: () => void;
  onScanAgain: () => void;
  loadingMap: boolean;
}

export default function ScanResult({ result, imageData, onFindLocations, onScanAgain, loadingMap }: ScanResultProps) {
  const config = ACTION_CONFIG[result.action] || ACTION_CONFIG.trash;

  const actionIcon = (action: string) => {
    switch (action) {
      case "recycle": return <Recycle className="w-6 h-6" />;
      case "donate": return <Heart className="w-6 h-6" />;
      case "hazardous": return <AlertTriangle className="w-6 h-6" />;
      default: return <Trash2 className="w-6 h-6" />;
    }
  };

  const showMapButton = ["recycle", "donate", "hazardous"].includes(result.action);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-3xl overflow-hidden h-48 bg-gray-100">
        <img src={imageData} alt={result.item_name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <span className="text-white font-semibold text-lg drop-shadow-lg">{result.item_name}</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color} font-bold text-sm shadow-lg`}>
            {actionIcon(result.action)}
            {config.label}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Material</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{result.material}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Action</p>
            <p className={`text-sm font-semibold mt-1 ${config.color}`}>{config.label}</p>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Condition Assessment</p>
          <p className="text-sm text-gray-700 leading-relaxed">{result.condition_assessment}</p>
        </div>
      </div>

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
