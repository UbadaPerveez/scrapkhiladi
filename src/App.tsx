import { useState, useRef, useEffect } from "react";
import {
  analyzeImageStructured,
  createAnalysisRecord,
  updateAnalysisRecommendation,
  addEvidence,
  fetchEvidence,
  saveScanHistory,
  fetchScanHistory,
  deleteScanEntry,
  fetchStats,
  type StructuredAnalysis,
  type EvidenceItem,
  type Recommendation,
  type AnalysisRecord,
  type ScanHistoryEntry,
} from "@/lib/supabase";
import { getApiKey, hasApiKey } from "@/lib/apiKey";
import { generateRecommendation, mapActionForLegacyTable } from "@/lib/decisionEngine";
import {
  getInitialQuestion,
  getNextQuestion,
  type Question,
} from "@/lib/questionTree";
import type { FunctionalCondition, RecommendedAction } from "@/lib/analysisTypes";
import ScanResult from "@/components/ScanResult";
import RecommendationView from "@/components/RecommendationView";
import InspectionFlow from "@/components/InspectionFlow";
import SettingsModal from "@/components/SettingsModal";
import HistoryView from "@/components/HistoryView";
import MapOverlay from "@/components/MapOverlay";
import { Settings, Camera, Image as ImageIcon, History, Leaf, Loader2, AlertCircle, ScanLine } from "lucide-react";

type AppState = "idle" | "scanning" | "result" | "inspection" | "recommendation" | "error";

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [imageData, setImageData] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [structuredAnalysis, setStructuredAnalysis] = useState<StructuredAnalysis | null>(null);
  const [analysisRecord, setAnalysisRecord] = useState<AnalysisRecord | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, saved: 0, byAction: {} as Record<string, number> });
  const [loadingMap, setLoadingMap] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapQueryType, setMapQueryType] = useState<string>("recycle");
  const [needsKey, setNeedsKey] = useState(!hasApiKey());
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const [entries, s] = await Promise.all([fetchScanHistory(), fetchStats()]);
    setHistory(entries);
    setStats(s);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const source = e.target?.result as string;
      const image = new Image();
      image.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        const base64 = compressed.split(",")[1];
        setImageData(compressed);
        setImageBase64(base64);
        setMimeType("image/jpeg");
        runStructuredAnalysis(base64, "image/jpeg");
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const runStructuredAnalysis = async (base64: string, type: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setNeedsKey(true);
      setShowSettings(true);
      setErrorMsg("Please add your Gemini API key in settings first.");
      setAppState("error");
      return;
    }

    setAppState("scanning");

    try {
      const result = await analyzeImageStructured(base64, apiKey, type);
      setStructuredAnalysis(result);

      const record = await createAnalysisRecord(
        result,
        imageData,
        coords?.lat || null,
        coords?.lng || null,
      );
      setAnalysisRecord(record);

      if (result.needs_more_information && result.next_question) {
        const analysisId = record?.id || "";
        const answeredFields = new Set<string>();
        const initialQuestion = getInitialQuestion(result, answeredFields);
        if (initialQuestion) {
          const questions: Question[] = [initialQuestion];
          setPendingQuestions(questions);

          // Generate initial recommendation based on image only
          const initialRec = generateRecommendation(result, []);
          setRecommendation(initialRec);

          if (initialRec.recommended_action === "NEEDS_MORE_INFORMATION") {
            setAppState("inspection");
          } else {
            // Even if recommendation exists, show inspection for better accuracy
            setAppState("inspection");
          }
        } else {
          const rec = generateRecommendation(result, []);
          setRecommendation(rec);
          if (record) {
            await updateAnalysisRecommendation(record.id, rec, result.visible_condition);
          }
          await saveToLegacyHistory(result, rec);
          setAppState("recommendation");
        }
      } else {
        const rec = generateRecommendation(result, []);
        setRecommendation(rec);
        if (record) {
          await updateAnalysisRecommendation(record.id, rec, result.visible_condition);
        }
        await saveToLegacyHistory(result, rec);
        setAppState("recommendation");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to analyze image");
      setAppState("error");
    }
  };

  const saveToLegacyHistory = async (
    analysis: StructuredAnalysis,
    rec: Recommendation,
  ) => {
    const legacyAction = mapActionForLegacyTable(rec.recommended_action);
    const savedFromLandfill = ["recycle", "donate", "hazardous"].includes(legacyAction);
    await saveScanHistory({
      item_name: analysis.item_type,
      material: analysis.visible_materials.join(", ") || "unknown",
      action: legacyAction,
      condition_assessment: rec.reason,
      image_data: imageData,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
      saved_from_landfill: savedFromLandfill,
    });
    await loadHistory();
  };

  const handleAnswerSubmit = async (
    field: string,
    value: string,
    description: string,
    additionalPhoto?: string,
  ) => {
    if (!analysisRecord) return;

    const newEvidence = await addEvidence(
      analysisRecord.id,
      "user_answer",
      "user_answer",
      field,
      value,
      description,
    );

    if (newEvidence) {
      const updatedEvidence = [...evidence, newEvidence];
      setEvidence(updatedEvidence);

      // If additional photo was provided, store it as image evidence
      if (additionalPhoto) {
        const photoEvidence = await addEvidence(
          analysisRecord.id,
          "image",
          "user_upload",
          field,
          "additional_photo",
          "Additional photo provided by user",
        );
        if (photoEvidence) {
          setEvidence((prev) => [...prev, photoEvidence]);
        }
      }
    }
  };

  const handleSkip = async (field: string) => {
    if (!analysisRecord) return;
    const newEvidence = await addEvidence(
      analysisRecord.id,
      "user_answer",
      "user_answer",
      field,
      "skipped",
      "User skipped this question",
    );
    if (newEvidence) {
      setEvidence((prev) => [...prev, newEvidence]);
    }
  };

  const handleInspectionComplete = async () => {
    if (!structuredAnalysis || !analysisRecord) return;

    const allEvidence = await fetchEvidence(analysisRecord.id);
    setEvidence(allEvidence);

    const rec = generateRecommendation(structuredAnalysis, allEvidence);
    setRecommendation(rec);

    await updateAnalysisRecommendation(analysisRecord.id, rec, structuredAnalysis.visible_condition);
    await saveToLegacyHistory(structuredAnalysis, rec);

    setAppState("recommendation");
  };

  const handleAnswerMore = () => {
    if (!structuredAnalysis) return;
    const answeredFields = new Set(evidence.map((e) => e.field));
    const initialQuestion = getInitialQuestion(structuredAnalysis, answeredFields);
    if (initialQuestion) {
      setPendingQuestions([initialQuestion]);
      setAppState("inspection");
    }
  };

  const handleFindLocations = () => {
    setLoadingMap(true);
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setLoadingMap(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        if (recommendation) {
          setMapQueryType(recommendation.recommended_action);
        }
        setShowMap(true);
        setLoadingMap(false);
      },
      (err) => {
        setErrorMsg(
          err.code === 1
            ? "Location permission denied. Please enable location access to find nearby facilities."
            : "Could not get your location. Please try again.",
        );
        setLoadingMap(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleDelete = async (id: string) => {
    const success = await deleteScanEntry(id);
    if (success) await loadHistory();
  };

  const resetScan = () => {
    setAppState("idle");
    setStructuredAnalysis(null);
    setAnalysisRecord(null);
    setEvidence([]);
    setRecommendation(null);
    setImageData("");
    setImageBase64("");
    setErrorMsg("");
    setPendingQuestions([]);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-white shadow-xl flex flex-col relative">
        {/* Header */}
        <header className="px-5 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">EcoScan</h1>
              <p className="text-[10px] text-gray-400 font-medium">Smart Waste Sorting</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(true)}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <History className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors relative ${
                needsKey ? "text-teal-600" : "text-gray-600"
              }`}
            >
              <Settings className="w-5 h-5" />
              {needsKey && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-teal-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 py-6 overflow-y-auto">
          {appState === "idle" && (
            <div className="flex flex-col items-center text-center pt-8">
              <div className="relative mb-8">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/30">
                    <ScanLine className="w-14 h-14 text-white" />
                  </div>
                </div>
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-teal-200 animate-spin-slow" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sort Smarter</h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">
                Scan any waste item with your camera and instantly learn how to dispose of it properly. Let's keep waste out of landfills together.
              </p>

              <div className="w-full space-y-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-teal-600/25 flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Scan Waste
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-5 h-5" />
                  Upload Image
                </button>
              </div>

              {stats.total > 0 && (
                <div className="mt-8 w-full bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-700">Your Impact</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-emerald-700">{stats.saved}</span>
                    <span className="text-sm text-gray-600">items saved from landfill</span>
                  </div>
                </div>
              )}

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {appState === "scanning" && (
            <div className="flex flex-col items-center justify-center pt-20">
              <div className="relative mb-8">
                <div className="w-40 h-40 rounded-3xl overflow-hidden">
                  <img src={imageData} alt="Scanning" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 rounded-3xl border-4 border-teal-500/40" />
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent animate-scan-line" />
              </div>
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Analyzing...</h2>
              <p className="text-sm text-gray-500 mt-1">AI is identifying your item</p>
            </div>
          )}

          {appState === "inspection" && structuredAnalysis && (
            <InspectionFlow
              questions={pendingQuestions}
              existingEvidence={evidence}
              onSubmitAnswer={handleAnswerSubmit}
              onSkip={handleSkip}
              onComplete={handleInspectionComplete}
              onCancel={() => {
                if (recommendation) {
                  setAppState("recommendation");
                } else {
                  handleInspectionComplete();
                }
              }}
            />
          )}

          {appState === "recommendation" && structuredAnalysis && recommendation && (
            <RecommendationView
              analysis={structuredAnalysis}
              recommendation={recommendation}
              evidence={evidence}
              imageData={imageData}
              onFindLocations={handleFindLocations}
              onScanAgain={resetScan}
              onAnswerMore={handleAnswerMore}
              loadingMap={loadingMap}
            />
          )}

          {appState === "result" && structuredAnalysis && recommendation && (
            <RecommendationView
              analysis={structuredAnalysis}
              recommendation={recommendation}
              evidence={evidence}
              imageData={imageData}
              onFindLocations={handleFindLocations}
              onScanAgain={resetScan}
              onAnswerMore={handleAnswerMore}
              loadingMap={loadingMap}
            />
          )}

          {appState === "error" && (
            <div className="flex flex-col items-center justify-center pt-20 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-6">{errorMsg}</p>
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={resetScan}
                  className="flex-1 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all"
                >
                  Back
                </button>
                {needsKey && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all"
                  >
                    Add Key
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Bottom nav indicator */}
        {appState === "idle" && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-center gap-1 text-xs text-gray-400">
            <Leaf className="w-3.5 h-3.5" />
            <span>Powered by Google Gemini AI</span>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setNeedsKey(false);
            if (appState === "error" && imageBase64) {
              runStructuredAnalysis(imageBase64, mimeType);
            }
          }}
        />
      )}

      {showHistory && (
        <HistoryView
          onClose={() => setShowHistory(false)}
          entries={history}
          onDelete={handleDelete}
          stats={stats}
        />
      )}

      {showMap && coords && (
        <MapOverlay
          latitude={coords.lat}
          longitude={coords.lng}
          queryType={mapQueryType}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
