"use client";

import { useState } from "react";
import { useModalEscape } from "@/hooks/useModalEscape";
import { TradeDetailsModalProps } from "@/types/pulse";
import { formatCurrency } from "@/utils/format";
import UpdateTradeModal from "./UpdateTradeModal";
import { PencilIcon } from "@heroicons/react/24/outline";
import { AlertTriangle, CheckCircle2, Camera } from "lucide-react";

export default function TradeDetailsModal({
  isOpen,
  onClose,
  trade,
  pulse,
  onRefresh,
}: TradeDetailsModalProps & { onRefresh?: () => void }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDismiss = () => {
    if (isEditModalOpen) setIsEditModalOpen(false);
    else onClose();
  };

  useModalEscape(isOpen, handleDismiss);

  if (!isOpen) return null;

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    onClose(); // Close the details modal as well since data has changed
    // Trigger refresh to update the UI with latest data
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 min-h-[100dvh] w-full overflow-y-auto bg-black/50 !mt-0"
        onClick={handleDismiss}
        role="presentation"
      >
        <div
          className="flex min-h-[100dvh] w-full items-center justify-center p-4"
          onClick={handleDismiss}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-800 bg-dark p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-details-title"
          >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="trade-details-title" className="text-xl font-bold text-foreground">
              Trade Details
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
                aria-label="Edit trade"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <TradeDetailsBody trade={trade} pulse={pulse} />
        </div>
      </div>
    </div>

      {/* Update Trade Modal */}
      {pulse && (
        <UpdateTradeModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          trade={trade}
          pulseId={pulse.id}
          firestoreId={pulse.firestoreId || ""}
          userId={pulse.userId}
          accountSize={pulse.accountSize}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Trade details body — richer layout for reviewing a trade. Organized into
// sections: headline summary, setup, performance & risk, plan/reflection,
// discipline (violations + rules), psychology, context, screenshots.
// ---------------------------------------------------------------------------

type TradeForBody = TradeDetailsModalProps["trade"];
type PulseForBody = TradeDetailsModalProps["pulse"];

function TradeDetailsBody({ trade, pulse }: { trade: TradeForBody; pulse: PulseForBody }) {
  const pl = trade.performance.profitLoss;
  const plPct = trade.performance.profitLossPercentage;
  const plColor = pl > 0 ? "text-emerald-400" : pl < 0 ? "text-red-400" : "text-gray-200";

  const outcomeStyle =
    trade.outcome === "Win"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : trade.outcome === "Loss"
        ? "bg-red-500/15 text-red-300 border-red-500/30"
        : "bg-gray-500/15 text-gray-300 border-gray-500/30";

  const typeStyle =
    trade.type === "Buy"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";

  const em = trade.engineMetrics;
  const hasRiskMetrics = !!em && (em.intendedRiskPct > 0 || em.actualR !== 0);
  const hasViolations = !!em && em.violations && em.violations.length > 0;

  return (
    <div className="space-y-5">
      {/* Headline summary strip */}
      <div className="rounded-lg border border-gray-800 bg-gray-800/30 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${typeStyle}`}>
            {trade.type}
          </span>
          <span className="text-base font-semibold text-gray-100">{trade.instrument || "—"}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${outcomeStyle}`}>
            {trade.outcome}
          </span>
          {trade.source && trade.source !== "manual" && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/25"
              title={trade.brokerSymbol ? `Synced from broker (${trade.brokerSymbol})` : "Synced from broker"}
            >
              Synced
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums leading-none ${plColor}`}>
            {pl > 0 ? "+" : ""}{formatCurrency(pl)}
          </div>
          <div className={`text-xs tabular-nums ${plColor} opacity-80 mt-0.5`}>
            {plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}% of account
            {em && em.actualR !== 0 && (
              <span className="text-gray-500 ml-2">·{" "}
                <span className={pl > 0 ? "text-emerald-400" : "text-red-400"}>
                  {em.actualR > 0 ? "+" : ""}{em.actualR.toFixed(2)}R
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Setup */}
      <Section title="Setup">
        <Grid>
          <Field label="Date" value={trade.date} />
          <Field label="Lot Size" value={String(trade.execution.lotSize)} />
          <Field label="Entry Price" value={String(trade.execution.entryPrice)} />
          <Field label="Exit Price" value={String(trade.execution.exitPrice)} />
          <Field label="Entry Time" value={trade.execution.entryTime || "—"} />
          <Field label="Exit Time" value={trade.execution.exitTime || "—"} />
          {trade.execution.plannedSL !== undefined && trade.execution.plannedSL !== null && (
            <Field label="Planned Stop Loss" value={String(trade.execution.plannedSL)} />
          )}
          {trade.execution.plannedTP !== undefined && trade.execution.plannedTP !== null && (
            <Field label="Planned Take Profit" value={String(trade.execution.plannedTP)} />
          )}
        </Grid>
      </Section>

      {/* Costs — present on synced/imported trades only */}
      {(trade.performance.grossProfitLoss !== undefined ||
        trade.performance.commission !== undefined ||
        trade.performance.swap !== undefined) && (
        <Section title="Costs">
          <Grid>
            {trade.performance.grossProfitLoss !== undefined && (
              <Field label="Gross P/L" value={formatCurrency(trade.performance.grossProfitLoss)} />
            )}
            {trade.performance.commission !== undefined && (
              <Field label="Commission" value={formatCurrency(trade.performance.commission)} />
            )}
            {trade.performance.swap !== undefined && (
              <Field label="Swap" value={formatCurrency(trade.performance.swap)} />
            )}
            <Field label="Net P/L" value={formatCurrency(pl)} valueClass={plColor} />
          </Grid>
        </Section>
      )}

      {/* Risk & R metrics — only when engine metrics are present */}
      {hasRiskMetrics && em && (
        <Section title="Risk & R-Multiple">
          <Grid>
            <Field
              label="Intended Risk"
              value={em.intendedRiskPct > 0 ? `${em.intendedRiskPct.toFixed(2)}% of account` : "—"}
            />
            <Field
              label="Planned R:R"
              value={em.intendedRR !== null ? `1 : ${em.intendedRR.toFixed(2)}` : "—"}
              hint={em.intendedRR === null ? "Set Planned TP to enable" : undefined}
            />
            <Field
              label="Actual R"
              value={`${em.actualR > 0 ? "+" : ""}${em.actualR.toFixed(2)}R`}
              valueClass={em.actualR > 0 ? "text-emerald-400" : em.actualR < 0 ? "text-red-400" : ""}
            />
            <Field
              label="Exit Quality"
              value={em.exitQuality !== null ? em.exitQuality.toFixed(2) : "—"}
              hint={
                em.exitQuality === null
                  ? "Set Planned TP to enable"
                  : em.exitQuality >= 1
                    ? "Met or beat plan"
                    : em.exitQuality > 0
                      ? "Partial of plan"
                      : "Break-even or worse"
              }
            />
          </Grid>
        </Section>
      )}

      {/* Plan & Reflection */}
      <Section title="Plan & Reflection">
        <div className="space-y-3 bg-gray-800/30 p-4 rounded-md">
          <Field
            label="Entry Reason"
            value={trade.execution.entryReason || "—"}
            multiline
          />
          {trade.source && trade.source !== "manual" &&
            trade.execution.entryReason?.startsWith("Synced from") && (
            <p className="text-xs text-gray-500 italic">
              This trade was synced automatically — edit it to add your entry
              reasoning and make the journal yours.
            </p>
          )}
          {trade.learnings && <Field label="Learnings" value={trade.learnings} multiline />}
          {trade.reflection?.wouldRepeat !== undefined && (
            <Field
              label="Would repeat this trade?"
              value={trade.reflection.wouldRepeat ? "Yes" : "No"}
              valueClass={trade.reflection.wouldRepeat ? "text-emerald-400" : "text-red-400"}
            />
          )}
          {trade.reflection?.emotionalImpact && (
            <Field label="Emotional impact" value={trade.reflection.emotionalImpact} />
          )}
          {trade.reflection?.mistakesIdentified && trade.reflection.mistakesIdentified.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Mistakes identified</p>
              <ul className="text-sm text-gray-300 space-y-0.5 list-disc list-inside">
                {trade.reflection.mistakesIdentified.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {trade.reflection?.improvementIdeas && (
            <Field label="Improvement ideas" value={trade.reflection.improvementIdeas} multiline />
          )}
        </div>
      </Section>

      {/* Discipline — violations + rules */}
      {(hasViolations || (trade.followedRules && trade.followedRules.length > 0)) && (
        <Section title="Discipline">
          <div className="space-y-3">
            {hasViolations && em && (
              <div className="rounded-md border border-red-500/25 bg-red-500/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Violations on this trade
                </p>
                <ul className="space-y-1.5">
                  {em.violations.map((v, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-gray-300 leading-snug">• {v.details}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded tabular-nums">
                        −{v.severity} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {trade.followedRules && trade.followedRules.length > 0 && (
              <div className="rounded-md border border-gray-800 bg-gray-800/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Rules followed
                </p>
                <ul className="space-y-1">
                  {trade.followedRules.map((ruleId, i) => {
                    const ruleDetails = pulse?.tradingRules?.find((r) => r.id === ruleId);
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>
                          {ruleDetails?.description || `Rule ${i + 1}`}
                          {ruleDetails?.isRequired && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-blue-400">Required</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Psychology */}
      {trade.psychology && (
        trade.psychology.emotionalState ||
        trade.psychology.mentalState ||
        trade.psychology.planAdherence ||
        trade.psychology.impulsiveEntry !== undefined ||
        trade.psychology.emotionalIntensity !== undefined
      ) && (
        <Section title="Psychology">
          <Grid>
            {trade.psychology.emotionalState && (
              <Field
                label="Emotional state"
                value={
                  trade.psychology.emotionalIntensity !== undefined
                    ? `${trade.psychology.emotionalState} (${trade.psychology.emotionalIntensity}/10)`
                    : trade.psychology.emotionalState
                }
              />
            )}
            {trade.psychology.mentalState && (
              <Field label="Mental state" value={trade.psychology.mentalState} />
            )}
            {trade.psychology.planAdherence && (
              <Field
                label="Plan adherence"
                value={trade.psychology.planAdherence}
                valueClass={
                  trade.psychology.planAdherence === "Fully"
                    ? "text-emerald-400"
                    : trade.psychology.planAdherence === "Deviated"
                      ? "text-red-400"
                      : "text-amber-400"
                }
              />
            )}
            {trade.psychology.impulsiveEntry !== undefined && (
              <Field
                label="Impulsive entry"
                value={trade.psychology.impulsiveEntry ? "Yes" : "No"}
                valueClass={trade.psychology.impulsiveEntry ? "text-red-400" : "text-emerald-400"}
              />
            )}
          </Grid>
        </Section>
      )}

      {/* Context */}
      {trade.context && (
        trade.context.marketCondition || trade.context.timeOfDay || trade.context.tradingEnvironment
      ) && (
        <Section title="Context">
          <Grid>
            {trade.context.marketCondition && (
              <Field label="Market condition" value={trade.context.marketCondition} />
            )}
            {trade.context.timeOfDay && (
              <Field label="Time of day" value={trade.context.timeOfDay} />
            )}
            {trade.context.tradingEnvironment && (
              <Field label="Trading environment" value={trade.context.tradingEnvironment} />
            )}
          </Grid>
        </Section>
      )}

      {/* Screenshots */}
      {(trade.execution.entryScreenshot || trade.execution.exitScreenshot) && (
        <Section title="Screenshots">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trade.execution.entryScreenshot && (
              <a
                href={trade.execution.entryScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-gray-800 bg-gray-800/30 overflow-hidden hover:border-gray-700 transition-colors group"
              >
                <div className="aspect-video bg-black/30 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trade.execution.entryScreenshot}
                    alt="Entry screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2 flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-gray-200">
                  <Camera className="w-3 h-3" />
                  Entry
                </div>
              </a>
            )}
            {trade.execution.exitScreenshot && (
              <a
                href={trade.execution.exitScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-gray-800 bg-gray-800/30 overflow-hidden hover:border-gray-700 transition-colors group"
              >
                <div className="aspect-video bg-black/30 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trade.execution.exitScreenshot}
                    alt="Exit screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2 flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-gray-200">
                  <Camera className="w-3 h-3" />
                  Exit
                </div>
              </a>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 bg-gray-800/30 p-4 rounded-md">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  valueClass,
  multiline,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "md:col-span-2" : undefined}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">{label}</p>
      <p className={`text-sm text-gray-200 ${multiline ? "whitespace-pre-line leading-relaxed" : ""} ${valueClass ?? ""}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  );
}
