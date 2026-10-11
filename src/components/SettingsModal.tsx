import { useState } from "react";
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from "@/lib/apiKey";
import { Eye, EyeOff, Key, Trash2, X } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const [keyValue, setKeyValue] = useState(getApiKey());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiKey(keyValue.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved();
      onClose();
    }, 800);
  };

  const handleClear = () => {
    clearApiKey();
    setKeyValue("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Key className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>
              <p className="text-xs text-gray-500">Configure your Gemini API key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="Paste your Gemini API key here..."
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Your key is stored locally in your browser and sent securely to our backend only when scanning. Get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 font-medium hover:underline"
              >
                Google AI Studio
              </a>
              .
            </p>
          </div>

          {hasApiKey() && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear saved key
            </button>
          )}

          {saved && (
            <div className="bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              API key saved successfully!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!keyValue.trim()}
            className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold transition-all active:scale-[0.98] shadow-lg shadow-teal-600/20 disabled:shadow-none"
          >
            Save API Key
          </button>
        </div>
      </div>
    </div>
  );
}
