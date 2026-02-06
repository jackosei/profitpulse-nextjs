"use client";

import { useState, useEffect, useCallback } from "react";
import type { Pulse, Trade } from "@/types/pulse";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usePulse } from "@/hooks/usePulse";
import type { TradeCreateData } from "@/services/api/pulseApi";
import type {
  TradeFormData,
  EmotionalState,
  MentalState,
  PlanAdherence,
  MarketCondition,
  TradingEnvironment,
  EmotionalImpact,
} from "./types";

// Import form components
import TradeDataForm from "./forms/TradeDataForm";
import PsychologyForm from "./forms/PsychologyForm";
import ContextForm from "./forms/ContextForm";
import ReflectionForm from "./forms/ReflectionForm";
import TradingRulesSection from "./forms/TradingRulesSection";

// Import icons for tabs
import {
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

type TabType = "trade" | "psychology" | "context" | "reflection";

interface TradeFormModalProps {
  mode: "create" | "update";
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pulseId: string;
  firestoreId: string;
  userId: string;
  accountSize: number;
  trade?: Trade; // Required for update mode
}

export default function TradeFormModal({
  mode,
  isOpen,
  onClose,
  onSuccess,
  pulseId,
  firestoreId,
  userId,
  accountSize,
  trade,
}: TradeFormModalProps) {
  const {
    getPulseById,
    createTrade,
    updateTrade,
    loading: apiLoading,
  } = usePulse({
    onError: (message) => toast.error(message),
  });
  const [loading, setLoading] = useState(false);
  const isSubmitting = loading || apiLoading;
  const [activeTab, setActiveTab] = useState<TabType>("trade");

  // Initialize form data based on mode
  const getInitialFormData = (): TradeFormData => {
    if (mode === "update" && trade) {
      return {
        // Trade tab
        date: trade.date || new Date().toISOString().split("T")[0],
        entryTime: trade.entryTime || "",
        exitTime: trade.exitTime || "",
        type: trade.type || "Buy",
        lotSize: String(trade.lotSize || ""),
        entryPrice: String(trade.entryPrice || ""),
        exitPrice: String(trade.exitPrice || ""),
        entryReason: trade.entryReason || "",
        profitLoss: String(trade.profitLoss || ""),
        learnings: trade.learnings || "",
        instrument: trade.instrument || "",
        entryScreenshot: trade.entryScreenshot || "",
        exitScreenshot: trade.exitScreenshot || "",

        // Psychology tab
        emotionalState: trade.emotionalState || "",
        emotionalIntensity: trade.emotionalIntensity ?? 5,
        mentalState: trade.mentalState || "",
        planAdherence: trade.planAdherence || "",
        impulsiveEntry: trade.impulsiveEntry ?? false,

        // Context tab
        marketCondition: trade.marketCondition || "",
        timeOfDay: trade.timeOfDay || "",
        tradingEnvironment: trade.tradingEnvironment || "",

        // Reflection tab
        wouldRepeat: trade.wouldRepeat ?? false,
        emotionalImpact: trade.emotionalImpact || "",
        mistakesIdentified: trade.mistakesIdentified?.join(", ") || "",
        improvementIdeas: trade.improvementIdeas || "",
      };
    }

    // Default for create mode
    return {
      date: new Date().toISOString().split("T")[0],
      entryTime: "",
      exitTime: "",
      type: "Buy",
      lotSize: "",
      entryPrice: "",
      exitPrice: "",
      entryReason: "",
      profitLoss: "",
      learnings: "",
      instrument: "",
      entryScreenshot: "",
      exitScreenshot: "",
      emotionalState: "",
      emotionalIntensity: 5,
      mentalState: "",
      planAdherence: "",
      impulsiveEntry: false,
      marketCondition: "",
      timeOfDay: "",
      tradingEnvironment: "",
      wouldRepeat: false,
      emotionalImpact: "",
      mistakesIdentified: "",
      improvementIdeas: "",
    };
  };

  const [formData, setFormData] = useState<TradeFormData>(getInitialFormData());
  const [error, setError] = useState("");
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [followedRules, setFollowedRules] = useState<string[]>(
    mode === "update" && trade?.followedRules ? trade.followedRules : [],
  );
  const [loadingPulse, setLoadingPulse] = useState(true);
  const [availableInstruments, setAvailableInstruments] = useState<string[]>(
    [],
  );

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value, type } = e.target;

      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prevData) => ({
          ...prevData,
          [name]: checked,
        }));
        return;
      }

      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    },
    [],
  );

  const handleTimeChange = useCallback(
    (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    },
    [],
  );

  // Reinitialize form data when trade or mode changes
  useEffect(() => {
    if (isOpen) {
      const initialData = getInitialFormData();
      setFormData(initialData);
      setFollowedRules(
        mode === "update" && trade?.followedRules ? trade.followedRules : [],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, trade, mode]);

  // Fetch pulse details when modal is opened
  useEffect(() => {
    if (isOpen && pulseId) {
      const fetchPulse = async () => {
        setLoadingPulse(true);
        try {
          const pulseData = await getPulseById(pulseId, userId);
          if (pulseData) {
            setPulse(pulseData);
            setAvailableInstruments(pulseData.instruments || []);
          }
        } catch (err) {
          console.error("Error fetching pulse:", err);
          toast.error("Failed to load pulse details");
        } finally {
          setLoadingPulse(false);
        }
      };
      fetchPulse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pulseId, userId]);

  const handleRuleToggle = (ruleId: string) => {
    setFollowedRules((prev) => {
      return prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : [...prev, ruleId];
    });
  };

  const validateForm = () => {
    // Check if all required rules are followed
    const requiredRules =
      pulse?.tradingRules?.filter((rule) => rule.isRequired) || [];
    const missingRequiredRules = requiredRules.filter(
      (rule) => !followedRules.includes(rule.id),
    );

    if (missingRequiredRules.length > 0) {
      setError(
        `Please confirm all required trading rules: ${missingRequiredRules.map((r) => r.description).join(", ")}`,
      );
      return false;
    }

    if (!formData.instrument) {
      setError("Please select an instrument");
      return false;
    }

    if (!formData.lotSize || Number(formData.lotSize) <= 0) {
      setError("Please enter a valid lot size");
      return false;
    }

    if (!formData.entryPrice || Number(formData.entryPrice) <= 0) {
      setError("Please enter a valid entry price");
      return false;
    }

    if (!formData.exitPrice || Number(formData.exitPrice) <= 0) {
      setError("Please enter a valid exit price");
      return false;
    }

    if (!formData.entryReason) {
      setError("Please provide an entry reason");
      return false;
    }

    if (!formData.profitLoss || isNaN(Number(formData.profitLoss))) {
      setError("Please enter the actual profit/loss amount");
      return false;
    }

    if (
      formData.entryTime &&
      formData.exitTime &&
      formData.entryTime > formData.exitTime
    ) {
      setError("Entry time must be earlier than exit time");
      return false;
    }

    const profitLoss = Number(formData.profitLoss);
    const entryPrice = Number(formData.entryPrice);
    const exitPrice = Number(formData.exitPrice);
    const tradeType = formData.type;

    const priceDifference = exitPrice - entryPrice;
    const expectedProfitableDirection =
      (tradeType === "Buy" && priceDifference > 0) ||
      (tradeType === "Sell" && priceDifference < 0);

    const isProfitable = profitLoss > 0;

    if (isProfitable !== expectedProfitableDirection && profitLoss !== 0) {
      setError(
        "The profit/loss amount doesn't match the expected result based on entry/exit prices. For a " +
          tradeType +
          " trade with entry at " +
          entryPrice +
          " and exit at " +
          exitPrice +
          ", the P/L should " +
          (expectedProfitableDirection ? "be positive" : "be negative"),
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const profitLoss = Number(formData.profitLoss);
      const outcome =
        profitLoss > 0
          ? ("Win" as const)
          : profitLoss < 0
            ? ("Loss" as const)
            : ("Break-even" as const);

      const mistakesIdentified = formData.mistakesIdentified
        ? formData.mistakesIdentified.split(",").map((m) => m.trim())
        : undefined;

      const tradeData: TradeCreateData = {
        date: formData.date,
        entryTime: formData.entryTime || undefined,
        exitTime: formData.exitTime || undefined,
        type: formData.type as "Buy" | "Sell",
        lotSize: Number(formData.lotSize),
        entryPrice: Number(formData.entryPrice),
        exitPrice: Number(formData.exitPrice),
        entryReason: formData.entryReason,
        learnings: formData.learnings || "",
        profitLoss,
        profitLossPercentage: (profitLoss / accountSize) * 100,
        outcome,
        pulseId,
        userId,
        instrument: formData.instrument,
        followedRules,

        // Screenshots
        entryScreenshot: formData.entryScreenshot || undefined,
        exitScreenshot: formData.exitScreenshot || undefined,

        // Psychological factors
        emotionalState: formData.emotionalState
          ? (formData.emotionalState as EmotionalState)
          : undefined,
        emotionalIntensity:
          formData.emotionalIntensity !== undefined
            ? Number(formData.emotionalIntensity)
            : undefined,
        mentalState: formData.mentalState
          ? (formData.mentalState as MentalState)
          : undefined,

        // Decision quality
        planAdherence: formData.planAdherence
          ? (formData.planAdherence as PlanAdherence)
          : undefined,
        impulsiveEntry:
          formData.impulsiveEntry !== undefined
            ? formData.impulsiveEntry
            : undefined,

        // Context factors
        marketCondition: formData.marketCondition
          ? (formData.marketCondition as MarketCondition)
          : undefined,
        timeOfDay: formData.timeOfDay || undefined,
        tradingEnvironment: formData.tradingEnvironment
          ? (formData.tradingEnvironment as TradingEnvironment)
          : undefined,

        // Reflection
        wouldRepeat:
          formData.wouldRepeat !== undefined ? formData.wouldRepeat : undefined,
        emotionalImpact: formData.emotionalImpact
          ? (formData.emotionalImpact as EmotionalImpact)
          : undefined,
        mistakesIdentified,
        improvementIdeas: formData.improvementIdeas || undefined,
      };

      // Filter out undefined values (Firebase doesn't allow undefined)
      const cleanedTradeData = Object.fromEntries(
        Object.entries(tradeData).filter(([_, value]) => value !== undefined),
      ) as TradeCreateData;

      let response;
      if (mode === "create") {
        response = await createTrade(firestoreId, cleanedTradeData);
      } else {
        response = await updateTrade(firestoreId, trade!.id!, cleanedTradeData);
      }

      if (!response) {
        throw new Error(`Failed to ${mode} trade`);
      }

      toast.success(
        `Trade ${mode === "create" ? "added" : "updated"} successfully!`,
        {
          description: `${cleanedTradeData.type} trade on ${cleanedTradeData.instrument} with P/L of $${cleanedTradeData.profitLoss.toFixed(2)}`,
          duration: 4000,
        },
      );

      onSuccess?.();
      onClose();

      // Reset form for create mode
      if (mode === "create") {
        setFormData(getInitialFormData());
        setFollowedRules([]);
      }
    } catch (error) {
      console.error(
        `Error ${mode === "create" ? "adding" : "updating"} trade:`,
        error,
      );
      setError(
        error instanceof Error
          ? error.message
          : `Failed to ${mode} trade. Please try again.`,
      );
      toast.error(`Failed to ${mode} trade`, {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or check your connection",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Tab completion indicators
  const isTradeComplete =
    formData.instrument &&
    formData.lotSize &&
    formData.entryPrice &&
    formData.exitPrice &&
    formData.entryReason &&
    formData.profitLoss;
  const isPsychologyComplete =
    formData.emotionalState ||
    formData.mentalState ||
    formData.planAdherence ||
    formData.impulsiveEntry;
  const isContextComplete =
    formData.marketCondition ||
    formData.timeOfDay ||
    formData.tradingEnvironment;
  const isReflectionComplete =
    formData.wouldRepeat ||
    formData.emotionalImpact ||
    formData.mistakesIdentified ||
    formData.improvementIdeas;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-dark p-6 rounded-lg border border-gray-800 w-full max-w-4xl max-h-[95vh] overflow-y-auto my-8">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-dark z-10 pb-4">
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Add Trade" : "Edit Trade"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white disabled:opacity-50 text-2xl"
          >
            ✕
          </button>
        </div>

        {loadingPulse ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-800 mb-6 overflow-x-auto">
              <button
                type="button"
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  activeTab === "trade"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("trade")}
              >
                <ArrowTrendingUpIcon className="h-4 w-4" />
                <span>Trade Data</span>
                {isTradeComplete && (
                  <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                )}
              </button>
              <button
                type="button"
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  activeTab === "psychology"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("psychology")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Psychology</span>
                {isPsychologyComplete && (
                  <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                )}
              </button>
              <button
                type="button"
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  activeTab === "context"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("context")}
              >
                <GlobeAltIcon className="h-4 w-4" />
                <span>Context</span>
                {isContextComplete && (
                  <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                )}
              </button>
              <button
                type="button"
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  activeTab === "reflection"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("reflection")}
              >
                <LightBulbIcon className="h-4 w-4" />
                <span>Reflection</span>
                {isReflectionComplete && (
                  <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "trade" && (
              <>
                <TradeDataForm
                  formData={formData}
                  onChange={handleInputChange}
                  isSubmitting={isSubmitting}
                  availableInstruments={availableInstruments}
                  onTimeChange={handleTimeChange}
                />
                <TradingRulesSection
                  pulse={pulse}
                  followedRules={followedRules}
                  onRuleToggle={handleRuleToggle}
                  isSubmitting={isSubmitting}
                />
              </>
            )}
            {activeTab === "psychology" && (
              <PsychologyForm
                formData={formData}
                onChange={handleInputChange}
                isSubmitting={isSubmitting}
              />
            )}
            {activeTab === "context" && (
              <ContextForm
                formData={formData}
                onChange={handleInputChange}
                isSubmitting={isSubmitting}
              />
            )}
            {activeTab === "reflection" && (
              <ReflectionForm
                formData={formData}
                onChange={handleInputChange}
                isSubmitting={isSubmitting}
              />
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-6 py-2 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <LoadingSpinner />}
                {isSubmitting
                  ? mode === "create"
                    ? "Adding..."
                    : "Updating..."
                  : mode === "create"
                    ? "Add Trade"
                    : "Update Trade"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
