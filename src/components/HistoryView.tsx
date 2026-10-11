import { useState, useEffect } from "react";
import { ScanHistoryEntry } from "@/lib/supabase";
import { ACTION_CONFIG } from "@/lib/constants";
import { Trash2, X, Clock, Recycle, Heart, AlertTriangle, Leaf } from "lucide-react";

interface HistoryViewProps {
  onClose: () => void;
  entries: ScanHistoryEntry[];
  onDelete: (id: string) => void;
  stats: { total: number; saved: number; byAction: Record<string, number> };
}

export default function HistoryView({ onClose, entries, onDelete, stats }: HistoryViewProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? entries : entries.filter((e) => e.action === filter);

  const actionIcon = (action: string) => {
    switch (action) {
      case "recycle": return <Recycle className="w-4 h-4" />;
      case "donate": return <Heart className="w-4 h-4" />;
      case "hazardous": return <AlertTriangle className="w-4 h-4" />;
      default: return <Trash2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Scan History</h2>
          <p className="text-xs text-gray-500">{stats.total} scans · {stats.saved} saved from landfill</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {stats.total > 0 && (
        <div className="px-5 py-4 bg-gradient-to-br from-teal-50 to-emerald-50 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-600">Items Saved</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.saved}</p>
              <p className="text-xs text-gray-500">diverted from landfill</p>
            </div>
            <div className="bg-white/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Recycle className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-medium text-gray-600">Total Scans</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">items analyzed</p>
            </div>
          </div>
        </div>
      )}

      {stats.total > 0 && (
        <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-gray-100">
          {["all", "recycle", "donate", "trash", "hazardous"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : ACTION_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">No scans yet</p>
            <p className="text-sm text-gray-400 mt-1">Start scanning items to see your history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.trash;
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  {entry.image_data ? (
                    <img
                      src={entry.image_data}
                      alt={entry.item_name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-2xl">{config.emoji}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{entry.item_name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} flex items-center gap-1 flex-shrink-0`}>
                        {actionIcon(entry.action)}
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.material}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
