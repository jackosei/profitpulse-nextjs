"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/hooks/usePulse";
import type { Pulse, Trade } from "@/types/pulse";
import Loader from "@/components/ui/LoadingSpinner";
import AddTradeModal from "@/components/modals/AddTradeModal";
import DeletePulseModal from "@/components/modals/DeletePulseModal";
import UpdatePulseModal from "@/components/modals/UpdatePulseModal";
import PulseHeader from "@/components/pulse/PulseHeader";
import PulseStats from "@/components/pulse/PulseStats";
import PerformanceControls from "@/components/pulse/PerformanceControls";
import PulseVitals from "@/components/pulse/PulseVitals";
import PulseTabs, { type PulseTab } from "@/components/pulse/PulseTabs";
import DisciplineChart from "@/components/discipline/DisciplineChart";
import PulseChart from "@/components/pulse/PulseChart";
import ViolationHistoryModal from "@/components/modals/ViolationHistoryModal";
import TradeHistory from "@/components/pulse/TradeHistory";
import TradeCalendar from "@/components/pulse/TradeCalendar";
import { toast } from "sonner";
import ArchivePulseModal from "@/components/modals/ArchivePulseModal";
import { getZone, computeSessionRuleScore } from "@/lib/disciplineEngine";
import type { DisciplineZone, ActiveConstraints, DisciplineState } from "@/lib/disciplineTypes";
import SessionGate from "@/components/discipline/SessionGate";
import ReflectionGate from "@/components/discipline/ReflectionGate";
import LimitsTracker from "@/components/discipline/LimitsTracker";
import WHYReminderBanner from "@/components/discipline/WHYReminderBanner";
import DisciplineMeter from "@/components/discipline/DisciplineMeter";
import StreakBadge from "@/components/discipline/StreakBadge";
import EditWHYModal from "@/components/modals/EditWHYModal";

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";
type ComparisonType = "PERIOD" | "START";
type ViewType = "by-day" | "table" | "calendar";

export default function PulseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const {
    getPulseById,
    getMoreTrades,
    archivePulse,
    loading: apiLoading,
    error: apiError,
  } = usePulse({
    onError: (message) => toast.error(message),
  });
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("30D");
  const [comparisonType, setComparisonType] =
    useState<ComparisonType>("PERIOD");
  const [viewType, setViewType] = useState<ViewType>("by-day");
  const [periodStats, setPeriodStats] = useState<{
    winRate: { current: number; previous: number; initial: number };
    totalPL: { current: number; previous: number; initial: number };
    plPercentage: { current: number; previous: number; initial: number };
    trades: { current: number; previous: number; initial: number };
    profitFactor: { current: number; previous: number; initial: number };
  }>({
    winRate: { current: 0, previous: 0, initial: 0 },
    totalPL: { current: 0, previous: 0, initial: 0 },
    plPercentage: { current: 0, previous: 0, initial: 0 },
    trades: { current: 0, previous: 0, initial: 0 },
    profitFactor: { current: 0, previous: 0, initial: 0 },
  });
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViolationsModal, setShowViolationsModal] = useState(false);
  const [showEditWHYModal, setShowEditWHYModal] = useState(false);

  // ─── Tab state — URL-synced via ?tab=… ─────────────────────────────
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlTab = searchParams.get("tab") as PulseTab | null;
  const [activeTab, setActiveTab] = useState<PulseTab | null>(
    urlTab && ["performance", "discipline", "trades"].includes(urlTab) ? urlTab : null,
  );

  const handleTabChange = useCallback(
    (next: PulseTab) => {
      setActiveTab(next);
      const params = new URLSearchParams(searchParams);
      params.set("tab", next);
      // scroll: false → prevents the page from jumping to top on tab change
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Phase 2: Enforcement local state
  const [reflectionPending, setReflectionPending] = useState(false);
  const [sessionGateAcked, setSessionGateAcked] = useState(false);
  const prevConstraintsRef = useRef<string | null>(null);

  const fetchPulse = useCallback(async () => {
    if (!user || !id) return;
    try {
      setLoading(true);
      const pulseData = await getPulseById(id as string, user.uid);
      if (pulseData) {
        setPulse(pulseData);
        setHasMore(pulseData.hasMore);
        setLastVisible(pulseData.lastVisible);
      }
    } catch (error) {
      console.error("Error fetching pulse:", error);
      setError("Failed to load pulse details");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const loadMoreTrades = useCallback(async () => {
    if (!pulse || !lastVisible || loadingMore) return;

    setLoadingMore(true);
    try {
      const firestoreId = pulse.firestoreId || "";
      const result = await getMoreTrades(firestoreId, lastVisible);

      if (result) {
        setPulse((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            trades: [...(prev.trades || []), ...result.trades] as Trade[],
          };
        });
        setHasMore(result.hasMore);
        setLastVisible(result.lastVisible);
      }
    } catch (error) {
      console.error("Error loading more trades:", error);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse, lastVisible, loadingMore]);

  const handlePulseDeleted = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleArchive = async () => {
    if (!user || !pulse) return;
    try {
      const success = await archivePulse(pulse.id, user.uid);
      if (success) {
        toast.success("Pulse archived successfully");
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to archive pulse");
    }
  };

  // Calculate stats for the selected time range
  const calculatePeriodStats = useCallback(
    (trades: Trade[], range: TimeRange) => {
      const now = new Date();
      let daysToSubtract = 30; // default to 30 days

      switch (range) {
        case "7D":
          daysToSubtract = 7;
          break;
        case "30D":
          daysToSubtract = 30;
          break;
        case "90D":
          daysToSubtract = 90;
          break;
        case "1Y":
          daysToSubtract = 365;
          break;
        case "ALL":
          daysToSubtract = 36500;
          break;
      }

      const periodStart = new Date(
        now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000,
      );
      const previousPeriodStart = new Date(
        periodStart.getTime() - daysToSubtract * 24 * 60 * 60 * 1000,
      );

      // Sort trades by date
      const sortedTrades = [...trades].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // Get initial trades (first period's worth of trades)
      const initialPeriodEnd = new Date(
        new Date(sortedTrades[0]?.date || now).getTime() +
        daysToSubtract * 24 * 60 * 60 * 1000,
      );
      const initialTrades = sortedTrades.filter(
        (trade) => new Date(trade.date) <= initialPeriodEnd,
      );

      // Current and previous period trades
      const currentPeriodTrades = trades.filter(
        (trade) => new Date(trade.date) >= periodStart,
      );
      const previousPeriodTrades = trades.filter((trade) => {
        const tradeDate = new Date(trade.date);
        return tradeDate >= previousPeriodStart && tradeDate < periodStart;
      });

      // Calculate stats for a period
      const calculateStats = (periodTrades: Trade[]) => {
        const wins = periodTrades.filter((t) => t.outcome === "Win").length;
        const total = periodTrades.length;
        const pl = periodTrades.reduce(
          (sum, t) => sum + t.performance.profitLoss,
          0,
        );

        // Calculate profit factor
        const winningTrades = periodTrades.filter((t) => t.outcome === "Win");
        const losingTrades = periodTrades.filter((t) => t.outcome === "Loss");
        const totalGrossProfit = winningTrades.reduce(
          (sum, t) => sum + t.performance.profitLoss,
          0,
        );
        const totalGrossLoss = losingTrades.reduce(
          (sum, t) => sum + Math.abs(t.performance.profitLoss),
          0,
        );
        const profitFactor =
          totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : 0;

        return {
          winRate: total > 0 ? (wins / total) * 100 : 0,
          totalPL: pl,
          plPercentage: pulse?.accountSize ? (pl / pulse.accountSize) * 100 : 0,
          trades: total,
          profitFactor: profitFactor,
        };
      };

      const currentStats = calculateStats(currentPeriodTrades);
      const previousStats = calculateStats(previousPeriodTrades);
      const initialStats = calculateStats(initialTrades);

      setPeriodStats({
        winRate: {
          current: currentStats.winRate,
          previous: previousStats.winRate,
          initial: initialStats.winRate,
        },
        totalPL: {
          current: currentStats.totalPL,
          previous: previousStats.totalPL,
          initial: initialStats.totalPL,
        },
        plPercentage: {
          current: currentStats.plPercentage,
          previous: previousStats.plPercentage,
          initial: initialStats.plPercentage,
        },
        trades: {
          current: currentStats.trades,
          previous: previousStats.trades,
          initial: initialStats.trades,
        },
        profitFactor: {
          current: currentStats.profitFactor,
          previous: previousStats.profitFactor,
          initial: initialStats.profitFactor,
        },
      });
    },
    [pulse?.accountSize],
  );

  // Update stats when time range changes
  useEffect(() => {
    if (pulse?.trades) {
      calculatePeriodStats(pulse.trades, selectedTimeRange);
    }
  }, [pulse?.trades, selectedTimeRange, calculatePeriodStats]);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  // Sync reflection pending state when pulse data changes
  useEffect(() => {
    if (pulse?.discipline?.reflectionGatePending !== undefined) {
      setReflectionPending(pulse.discipline.reflectionGatePending);
    }

    // Check if active constraints escalated to re-trigger Session Gate
    if (pulse?.discipline?.activeConstraints) {
      const currentConstraintsStr = JSON.stringify(pulse.discipline.activeConstraints);
      if (prevConstraintsRef.current !== null && prevConstraintsRef.current !== currentConstraintsStr) {
        // Constraints changed! If there are any active constraints, force a re-ack.
        const c = pulse.discipline.activeConstraints;
        if (c.riskCapPct !== null || c.tradeCapCount !== null || c.lockoutUntil !== null || c.noTradeDays > 0) {
          setSessionGateAcked(false);
        }
      }
      prevConstraintsRef.current = currentConstraintsStr;
    }
  }, [pulse?.discipline?.reflectionGatePending, pulse?.discipline?.activeConstraints]);

  if (loading || apiLoading) return <Loader />;
  if (error || apiError)
    return <div className="p-6 text-red-500">{error || apiError}</div>;
  if (!pulse) return <div className="p-6">Pulse not found</div>;

  // ---------------------------------------------------------------------------
  // Discipline data — computed from pulse state + today's trades
  // ---------------------------------------------------------------------------
  const discipline = pulse.discipline;
  const disciplineScore = discipline?.disciplineScore;
  const disciplineZone: DisciplineZone | undefined =
    disciplineScore !== undefined ? getZone(disciplineScore) : undefined;

  // Compute today's Session Rule Score from loaded trades
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTrades = (pulse.trades ?? []).filter(
    (t) => t.date === todayStr,
  );
  const pulseRules = (pulse.tradingRules ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    isRequired: r.isRequired,
  }));
  const sessionScore =
    pulseRules.length > 0
      ? computeSessionRuleScore(todayTrades, pulseRules, todayStr)
      : null;
  const sessionRuleScore = sessionScore?.score;

  // Recovery hint — simple, no recovery if clean
  const recoveryHint =
    disciplineZone === "RED"
      ? "Log a clean session with all required rules followed to begin recovery"
      : disciplineZone === "YELLOW"
        ? "Continue following your rules — clean sessions recover +8 pts"
        : "";

  // Phase 2: enforcement constraints
  const activeConstraints: ActiveConstraints = discipline?.activeConstraints ?? {
    riskCapPct: null,
    tradeCapCount: null,
    lockoutUntil: null,
    noTradeDays: 0,
    cleanSessionsToLift: 0,
    ntdWarningPending: false,
  };
  const disciplineState: DisciplineState = discipline?.disciplineState ?? "NORMAL";

  // ─── Smart default tab ─────────────────────────────────────────────
  // If no ?tab=… in URL, default to Discipline when there's something
  // to attend to (active caps, non-green zone, reflection pending);
  // otherwise default to Performance.
  const hasActiveConstraints =
    activeConstraints.riskCapPct !== null ||
    activeConstraints.tradeCapCount !== null ||
    activeConstraints.noTradeDays > 0 ||
    activeConstraints.lockoutUntil !== null;
  const computedDefaultTab: PulseTab =
    hasActiveConstraints ||
    disciplineZone !== "GREEN" ||
    (discipline?.reflectionGatePending ?? false)
      ? "discipline"
      : "performance";
  const tab: PulseTab = activeTab ?? computedDefaultTab;

  // Count of constraints for the discipline tab badge
  const activeConstraintCount =
    (activeConstraints.riskCapPct !== null ? 1 : 0) +
    (activeConstraints.tradeCapCount !== null ? 1 : 0) +
    (activeConstraints.noTradeDays > 0 ? 1 : 0) +
    (activeConstraints.lockoutUntil !== null ? 1 : 0);

  return (
    <div className="min-h-screen p-0 md:p-6 space-y-4 md:space-y-5">
      <PulseHeader
        name={pulse.name}
        instrument={pulse.instruments?.join(", ") || "N/A"}
        accountSize={pulse.accountSize}
        createdAt={pulse.createdAt}
        onArchive={() => setShowArchiveModal(true)}
        onDelete={() => setShowDeleteModal(true)}
        onUpdate={() => setShowUpdateModal(true)}
        onAddTrade={() => setShowAddTradeModal(true)}
        maxRiskPerTrade={pulse.maxRiskPerTrade}
        maxDailyDrawdown={pulse.maxDailyDrawdown}
        maxTotalDrawdown={pulse.maxTotalDrawdown}
        status={pulse.status}
        ruleViolations={pulse.ruleViolations}
        pulse={pulse}
        addTradeDisabled={pulse.status === "locked"}
      />

      {/* WHY reminder — persistent across tabs when zone is degraded */}
      <WHYReminderBanner
        pulseId={pulse.id}
        whyStatement={discipline?.whyStatement ?? ""}
        whyDiscipline={discipline?.whyDiscipline ?? ""}
        zone={disciplineZone ?? "GREEN"}
        onEdit={() => setShowEditWHYModal(true)}
      />

      {/* Vitals strip — always visible above tabs */}
      <PulseVitals pulse={pulse} onJumpToDiscipline={() => handleTabChange("discipline")} />

      {/* Unified tab card — tabs and the active panel share one container so
          the content visibly belongs to the selected tab. */}
      <div className="bg-dark border border-gray-800 rounded-lg overflow-hidden">
        {/* Tab strip row — tabs on the left, contextual controls on the right
            (currently: the time-range / comparison controls for the Performance tab). */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-800/70 pl-2 sm:pl-3 pr-2 sm:pr-3">
          <PulseTabs
            active={tab}
            onChange={handleTabChange}
            badges={{ discipline: activeConstraintCount }}
          />
          {tab === "performance" && (
            <div className="shrink-0 py-1.5">
              <PerformanceControls
                selectedTimeRange={selectedTimeRange}
                comparisonType={comparisonType}
                onTimeRangeChange={setSelectedTimeRange}
                onComparisonTypeChange={() =>
                  setComparisonType((prev) => (prev === "PERIOD" ? "START" : "PERIOD"))
                }
              />
            </div>
          )}
        </div>

        <div
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="p-4 md:p-5 bg-white/[0.015]"
        >
        {tab === "performance" && (
          <div className="space-y-4">
            <PulseStats stats={periodStats} comparisonType={comparisonType} />

            {/* Equity Curve */}
            <div className="bg-dark rounded-lg border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Equity Curve</span>
              </div>
              <div className="h-[260px] md:h-[300px] p-3 md:p-4">
                {pulse.trades && pulse.trades.length > 0 ? (
                  <PulseChart trades={pulse.trades} timeRange={selectedTimeRange} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-600">
                    <span className="text-3xl">📈</span>
                    <p className="text-sm">No trades yet — log your first trade to see the curve</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "discipline" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
              {disciplineScore !== undefined && disciplineZone !== undefined && sessionRuleScore !== undefined && (
                <DisciplineMeter
                  score={disciplineScore}
                  zone={disciplineZone}
                  sessionRuleScore={sessionRuleScore}
                  recoveryHint={recoveryHint}
                  activeConstraints={activeConstraints}
                  disciplineState={disciplineState}
                  enforcementMode={discipline?.enforcementMode ?? "SCORE_BASED"}
                  weeklySeverityTotal={discipline?.weeklySeverityTotal ?? 0}
                />
              )}
              <StreakBadge consecutiveCleanDays={discipline?.consecutiveCleanDays ?? 0} />
            </div>

            <LimitsTracker pulse={pulse} />

            {/* Discipline Score chart */}
            <div className="bg-dark rounded-lg border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Discipline Score Over Time</span>
              </div>
              <div className="p-3 md:p-4">
                <DisciplineChart pulseId={pulse.id} />
              </div>
            </div>

            {/* WHY statements — always visible, editable */}
            <div className="rounded-lg border border-gray-800 bg-dark overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your WHY</span>
                <button
                  type="button"
                  onClick={() => setShowEditWHYModal(true)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  Edit
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Why I trade</p>
                  <p className="text-sm text-gray-300 italic leading-relaxed">
                    {discipline?.whyStatement
                      ? `"${discipline.whyStatement}"`
                      : <span className="text-gray-600 not-italic">Not set — <button type="button" onClick={() => setShowEditWHYModal(true)} className="text-accent hover:underline">add your why</button></span>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">What following my rules means to me</p>
                  <p className="text-sm text-gray-300 italic leading-relaxed">
                    {discipline?.whyDiscipline
                      ? `"${discipline.whyDiscipline}"`
                      : <span className="text-gray-600 not-italic">Not set</span>
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Violation History trigger */}
            <button
              type="button"
              onClick={() => setShowViolationsModal(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-800 bg-dark hover:border-gray-700 hover:bg-dark/80 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <span className="text-xs">⚠️</span>
                </span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-200">Violation History</p>
                  <p className="text-xs text-gray-500">Review past breaches and score deltas</p>
                </div>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-300">View →</span>
            </button>
          </div>
        )}

        {tab === "trades" && (
          <>
            {viewType === "calendar" ? (
              <TradeCalendar
                trades={pulse.trades || []}
                pulse={pulse}
                onAddTrade={() => setShowAddTradeModal(true)}
                onRefresh={fetchPulse}
                viewType={viewType}
                onViewTypeChange={setViewType}
              />
            ) : (
              <TradeHistory
                trades={pulse.trades || []}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMoreTrades}
                onAddTrade={() => setShowAddTradeModal(true)}
                onRefresh={fetchPulse}
                pulse={pulse}
                viewType={viewType}
                onViewTypeChange={setViewType}
              />
            )}
          </>
        )}
        </div>
      </div>

      <AddTradeModal
        isOpen={showAddTradeModal}
        onClose={() => setShowAddTradeModal(false)}
        onSuccess={fetchPulse}
        pulseId={pulse.id}
        firestoreId={pulse.firestoreId || ""}
        userId={user!.uid}
        maxRiskPercentage={pulse.maxRiskPerTrade}
        accountSize={pulse.accountSize}
      />

      <UpdatePulseModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSuccess={fetchPulse}
        pulse={pulse}
      />

      <DeletePulseModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        pulse={{
          id: pulse.id,
          name: pulse.name,
        }}
        onSuccess={handlePulseDeleted}
      />

      <ArchivePulseModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
        pulseName={pulse.name}
      />

      <ViolationHistoryModal
        isOpen={showViolationsModal}
        onClose={() => setShowViolationsModal(false)}
        pulseId={pulse.id}
      />

      <EditWHYModal
        isOpen={showEditWHYModal}
        onClose={() => setShowEditWHYModal(false)}
        pulseId={pulse.id}
        initialWhyStatement={discipline?.whyStatement ?? ""}
        initialWhyDiscipline={discipline?.whyDiscipline ?? ""}
        onSuccess={(stmt, disc) => {
          setPulse(prev => prev ? {
            ...prev,
            discipline: prev.discipline
              ? { ...prev.discipline, whyStatement: stmt, whyDiscipline: disc }
              : prev.discipline,
          } : prev);
        }}
      />

      {/* Phase 2: Session Gate — constraint acknowledgement */}
      {!sessionGateAcked && disciplineState !== "NORMAL" && user && (
        <SessionGate
          pulseId={pulse.id}
          userId={user.uid}
          constraints={activeConstraints}
          disciplineState={disciplineState}
          whyStatement={discipline?.whyStatement ?? ""}
          onAcknowledge={() => setSessionGateAcked(true)}
        />
      )}

      {/* Phase 2: Reflection Gate — blocks until reflection completed */}
      {reflectionPending && user && (
        <ReflectionGate
          pulseId={pulse.id}
          userId={user.uid}
          onComplete={(newScore) => {
            setReflectionPending(false);
            toast.success(`Reflection submitted! +5 recovery → Score: ${newScore}`);
            fetchPulse(); // Refresh pulse data
          }}
        />
      )}
    </div>
  );
}
