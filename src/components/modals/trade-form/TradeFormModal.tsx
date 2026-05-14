"use client";

import { useState, useEffect, useCallback } from "react";
import type { Pulse, Trade, TradeEvaluationResult } from "@/types/pulse";
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
import {
  ViolationCategory,
} from "@/lib/disciplineTypes";
import type { ActiveConstraints } from "@/lib/disciplineTypes";
import { AlertTriangle, X } from "lucide-react";

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
    error: apiError,
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
        // Trade tab - read from nested execution and performance
        date: trade.date || new Date().toISOString().split("T")[0],
        entryTime: trade.execution?.entryTime || "",
        exitTime: trade.execution?.exitTime || "",
        type: trade.type || "Buy",
        lotSize: String(trade.execution?.lotSize || ""),
        entryPrice: String(trade.execution?.entryPrice || ""),
        exitPrice: String(trade.execution?.exitPrice || ""),
        plannedSL: String(trade.execution?.plannedSL || ""),
        plannedTP: String(trade.execution?.plannedTP || ""),
        entryReason: trade.execution?.entryReason || "",
        profitLoss: String(trade.performance?.profitLoss || ""),
        learnings: trade.learnings || "",
        instrument: trade.instrument || "",
        entryScreenshot: trade.execution?.entryScreenshot || "",
        exitScreenshot: trade.execution?.exitScreenshot || "",

        // Psychology tab - read from nested psychology
        emotionalState: trade.psychology?.emotionalState || "",
        emotionalIntensity: trade.psychology?.emotionalIntensity ?? 5,
        mentalState: trade.psychology?.mentalState || "",
        planAdherence: trade.psychology?.planAdherence || "",
        impulsiveEntry: trade.psychology?.impulsiveEntry ?? false,

        // Context tab - read from nested context
        marketCondition: trade.context?.marketCondition || "",
        timeOfDay: trade.context?.timeOfDay || "",
        tradingEnvironment: trade.context?.tradingEnvironment || "",

        // Reflection tab - read from nested reflection
        wouldRepeat: trade.reflection?.wouldRepeat ?? false,
        emotionalImpact: trade.reflection?.emotionalImpact || "",
        mistakesIdentified:
          trade.reflection?.mistakesIdentified?.join(", ") || "",
        improvementIdeas: trade.reflection?.improvementIdeas || "",
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
      plannedSL: "",
      plannedTP: "",
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
    // Note: required rules are NOT a form gate. Unchecked required rules are
    // passed to the discipline engine which applies a -4 score penalty per miss.
    if (!formData.instrument) {
      setError("Please select an instrument");
      return false;
    }
    
    if (!formData.date) {
      setError("Please select a trade date");
      return false;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (formData.date > todayStr) {
      setError("Future dates are not allowed for trades");
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

      // Build nested trade data structure
      const tradeData: TradeCreateData = {
        date: formData.date,
        type: formData.type as "Buy" | "Sell",
        outcome,
        pulseId,
        userId,
        instrument: formData.instrument,

        // Execution data (required)
        execution: {
          lotSize: Number(formData.lotSize),
          entryPrice: Number(formData.entryPrice),
          exitPrice: Number(formData.exitPrice),
          entryReason: formData.entryReason,
          ...(formData.plannedSL && Number(formData.plannedSL) > 0 && { plannedSL: Number(formData.plannedSL) }),
          ...(formData.plannedTP && Number(formData.plannedTP) > 0 && { plannedTP: Number(formData.plannedTP) }),
          ...(formData.entryTime && { entryTime: formData.entryTime }),
          ...(formData.exitTime && { exitTime: formData.exitTime }),
          ...(formData.entryScreenshot && {
            entryScreenshot: formData.entryScreenshot,
          }),
          ...(formData.exitScreenshot && {
            exitScreenshot: formData.exitScreenshot,
          }),
        },

        // Performance data (required)
        performance: {
          profitLoss,
          profitLossPercentage: (profitLoss / accountSize) * 100,
        },

        // Other top-level fields
        ...(formData.learnings && { learnings: formData.learnings }),
        ...(followedRules.length > 0 && { followedRules }),
      };

      // Psychology data (optional)
      const psychologyData: Record<string, string | number | boolean> = {};
      if (formData.emotionalState) {
        psychologyData.emotionalState =
          formData.emotionalState as EmotionalState;
      }
      if (formData.emotionalIntensity !== undefined) {
        psychologyData.emotionalIntensity = Number(formData.emotionalIntensity);
      }
      if (formData.mentalState) {
        psychologyData.mentalState = formData.mentalState as MentalState;
      }
      if (formData.planAdherence) {
        psychologyData.planAdherence = formData.planAdherence as PlanAdherence;
      }
      if (formData.impulsiveEntry !== undefined) {
        psychologyData.impulsiveEntry = formData.impulsiveEntry;
      }
      if (Object.keys(psychologyData).length > 0) {
        tradeData.psychology = psychologyData;
      }

      // Context data (optional)
      const contextData: Record<string, string> = {};
      if (formData.marketCondition) {
        contextData.marketCondition =
          formData.marketCondition as MarketCondition;
      }
      if (formData.timeOfDay) {
        contextData.timeOfDay = formData.timeOfDay;
      }
      if (formData.tradingEnvironment) {
        contextData.tradingEnvironment =
          formData.tradingEnvironment as TradingEnvironment;
      }
      if (Object.keys(contextData).length > 0) {
        tradeData.context = contextData;
      }

      // Reflection data (optional)
      const reflectionData: Record<string, boolean | string | string[]> = {};
      if (formData.wouldRepeat !== undefined) {
        reflectionData.wouldRepeat = formData.wouldRepeat;
      }
      if (formData.emotionalImpact) {
        reflectionData.emotionalImpact =
          formData.emotionalImpact as EmotionalImpact;
      }
      if (mistakesIdentified) {
        reflectionData.mistakesIdentified = mistakesIdentified;
      }
      if (formData.improvementIdeas) {
        reflectionData.improvementIdeas = formData.improvementIdeas;
      }
      if (Object.keys(reflectionData).length > 0) {
        tradeData.reflection = reflectionData;
      }

      let response: TradeEvaluationResult | null = null;
      let tradeResult;
      if (mode === "create") {
        response = await createTrade(firestoreId, tradeData);
        tradeResult = response?.trade;
      } else {
        tradeResult = await updateTrade(firestoreId, trade!.id!, tradeData);
      }

      if (!tradeResult) {
        // Stop submission. error state and toast are handled automatically by usePulse
        return;
      }

      toast.success(
        `Trade ${mode === "create" ? "added" : "updated"} successfully!`,
        {
          description: `${tradeData.type} trade on ${tradeData.instrument} with P/L of $${tradeData.performance.profitLoss.toFixed(2)}`,
          duration: 4000,
        },
      );

      // Discipline breach notification — only on create
      if (mode === "create" && response) {
        const violations = (response.violations as { category: string; type: string; severity: number; details: string }[]) ?? [];
        const isViolationTrade = response.isViolationTrade === true;
        const activeConstraints = response.activeConstraints as ActiveConstraints;
        const hasCaps =
          activeConstraints?.riskCapPct !== null ||
          activeConstraints?.tradeCapCount !== null ||
          activeConstraints?.noTradeDays > 0;

        if (violations.length > 0 || isViolationTrade || hasCaps) {
          const totalPenalty = violations.reduce((sum, v) => sum + v.severity, 0);
          const ruleBreaches = violations.filter(
            (v) => v.category === ViolationCategory.QUALITATIVE,
          );
          const quantBreaches = violations.filter(
            (v) => v.category === ViolationCategory.QUANTITATIVE,
          );

          toast.custom(
            (id) => (
              <div className="w-[360px] rounded-xl border border-amber-500/30 bg-[#1a1a1a] shadow-xl p-4 text-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="font-semibold text-amber-400">Discipline breach detected</span>
                  </div>
                  <button
                    onClick={() => toast.dismiss(id)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Rule misses */}
                {ruleBreaches.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                      Rules missed
                    </p>
                    <ul className="space-y-1.5">
                      {ruleBreaches.map((v, i) => (
                        <li key={i} className="flex items-start justify-between gap-2">
                          <span className="text-gray-300 leading-snug">• {v.details}</span>
                          <span className="shrink-0 text-xs font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                            −{v.severity} pts
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quantitative breaches */}
                {quantBreaches.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                      Risk &amp; limits
                    </p>
                    <ul className="space-y-1.5">
                      {quantBreaches.map((v, i) => (
                        <li key={i} className="flex items-start justify-between gap-2">
                          <span className="text-gray-300 leading-snug">• {v.details}</span>
                          <span className="shrink-0 text-xs font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                            −{v.severity} pts
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Enforcement Constraint Warning */}
                {(isViolationTrade || hasCaps) && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                      Enforcement Actions
                    </p>
                    <ul className="space-y-1.5">
                      {isViolationTrade && (
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 leading-snug font-medium">
                            • Trade logged during a No-Trade Day
                          </span>
                        </li>
                      )}
                      {activeConstraints?.riskCapPct !== null && (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-400 leading-snug">
                            • Next session risk capped at {Math.round(activeConstraints!.riskCapPct! * 100)}%
                          </span>
                        </li>
                      )}
                      {activeConstraints?.tradeCapCount !== null && (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-400 leading-snug">
                            • Next session trade count capped at {activeConstraints.tradeCapCount}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Footer summary */}
                <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-500/80">
                    Discipline score impacted
                  </span>
                  {totalPenalty > 0 && (
                    <span className="text-sm font-bold text-red-400">
                      -{totalPenalty} pts total
                    </span>
                  )}
                </div>
              </div>
            ),
            { duration: 6000 },
          );
        }
      }


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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
      <div className="relative my-2 flex min-h-0 w-full max-w-4xl max-h-[min(95vh,calc(100dvh-1rem))] flex-col overflow-hidden rounded-lg border border-gray-800 bg-dark shadow-xl sm:my-4">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-3 sm:px-6 sm:py-3.5">
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Add Trade" : "Edit Trade"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-2xl text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loadingPulse ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={handleSubmit}
          >
            {/* Tab navigation — fixed below header; only tab content scrolls */}
            <div className="flex shrink-0 overflow-x-auto border-b border-gray-800 bg-dark px-1 sm:px-3">
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
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

            {(error || apiError) && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error || apiError}</p>
              </div>
            )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-800 bg-dark px-5 py-4 sm:px-6">
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
