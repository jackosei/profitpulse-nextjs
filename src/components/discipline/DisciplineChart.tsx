"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { TrendingUp, BarChart2 } from "lucide-react";

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";

interface HistoryPoint {
  date: string;
  score: number;
}

interface DisciplineChartProps {
  pulseId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANGE_LABELS: Record<TimeRange, string> = {
  "7D": "7D",
  "30D": "30D",
  "90D": "90D",
  "1Y": "1Y",
  ALL: "All",
};

const RANGES: TimeRange[] = ["7D", "30D", "90D", "1Y", "ALL"];

// Zone color thresholds
const GREEN_MIN = 75;
const YELLOW_MIN = 40;

/** Get a CSS rgba color for a score value */
function scoreToColor(score: number): string {
  if (score >= GREEN_MIN) return "rgba(16, 185, 129, 1)"; // emerald-500
  if (score >= YELLOW_MIN) return "rgba(245, 158, 11, 1)"; // amber-500
  return "rgba(239, 68, 68, 1)"; // red-500
}

// ---------------------------------------------------------------------------
// Chart options
// ---------------------------------------------------------------------------

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index",
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      titleColor: "#94a3b8",
      bodyColor: "#e2e8f0",
      padding: 10,
      callbacks: {
        title: (items) => items[0]?.label ?? "",
        label: (item) => ` Score: ${Math.round(item.parsed.y)}/100`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: {
        color: "#64748b",
        maxTicksLimit: 8,
        font: { size: 11 },
      },
      border: { color: "rgba(255,255,255,0.06)" },
    },
    y: {
      min: 0,
      max: 100,
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: {
        color: "#64748b",
        stepSize: 20,
        font: { size: 11 },
        callback: (value) => `${value}`,
      },
      border: { color: "rgba(255,255,255,0.06)" },
    },
  },
};

// ---------------------------------------------------------------------------
// Build Chart.js dataset from history points
// ---------------------------------------------------------------------------

function buildChartData(points: HistoryPoint[]): ChartData<"line"> {
  const labels = points.map((p) => {
    const d = new Date(p.date + "T00:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  });

  const scores = points.map((p) => p.score);

  // Segment colors per point
  const pointColors = scores.map(scoreToColor);

  return {
    labels,
    datasets: [
      {
        data: scores,
        borderColor: pointColors,
        backgroundColor: "transparent",
        segment: {
          borderColor: (ctx) => scoreToColor(ctx.p1.parsed.y),
        },
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: points.length > 90 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      },
      // Green zone upper band
      {
        data: scores.map(() => 100),
        borderColor: "transparent",
        backgroundColor: "rgba(16, 185, 129, 0.06)",
        fill: { target: "dataset-green-floor" as never, above: "rgba(16, 185, 129, 0.06)" },
        pointRadius: 0,
        borderWidth: 0,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Zone reference lines (drawn as annotation plugin — using manual SVG overlay instead)
// ---------------------------------------------------------------------------

function ZoneBands() {
  return (
    <div className="absolute inset-y-0 right-0 left-[48px] pointer-events-none" aria-hidden>
      {/* Green band (75-100) */}
      <div
        className="absolute left-0 right-0 bg-emerald-500/5 border-b border-emerald-500/20"
        style={{ top: 0, height: "25%" }}
      />
      {/* Yellow band (40-74) */}
      <div
        className="absolute left-0 right-0 bg-yellow-500/5 border-b border-yellow-500/20"
        style={{ top: "25%", height: "35%" }}
      />
      {/* Red band (0-39) */}
      <div
        className="absolute left-0 right-0 bg-red-500/5"
        style={{ top: "60%", height: "40%" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DisciplineChart({ pulseId }: DisciplineChartProps) {
  const { user } = useAuth();
  const [range, setRange] = useState<TimeRange>("30D");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/discipline/history?pulseId=${encodeURIComponent(pulseId)}&range=${range}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load discipline history");
      const json = await res.json() as { data: HistoryPoint[] };
      setHistory(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user, pulseId, range]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // Derived stats
  const latestScore = history.at(-1)?.score ?? 100;
  const earliestScore = history.at(0)?.score ?? 100;
  const delta = latestScore - earliestScore;
  const deltaColor = delta >= 0 ? "text-emerald-400" : "text-red-400";
  const deltaPrefix = delta >= 0 ? "+" : "";

  const chartData = buildChartData(history);

  return (
    <div className="bg-dark p-4 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-200">Discipline Score History</span>
          {!loading && history.length > 0 && (
            <span className={`text-xs font-medium ${deltaColor} ml-1`}>
              {deltaPrefix}{Math.round(delta)} pts this period
            </span>
          )}
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 bg-gray-900/60 rounded-md p-0.5 border border-gray-800">
          {RANGES.map((r) => (
            <button
              key={r}
              id={`discipline-chart-range-${r}`}
              onClick={() => setRange(r)}
              className={`text-xs px-2.5 py-1 rounded transition-all ${
                range === r
                  ? "bg-gray-700 text-gray-100 font-semibold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Zone legend */}
      <div className="flex items-center gap-4 mb-3">
        {[
          { label: "Stable", color: "bg-emerald-500" },
          { label: "At Risk", color: "bg-yellow-500" },
          { label: "Enforcement", color: "bg-red-500" },
        ].map((z) => (
          <div key={z.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${z.color} opacity-70`} />
            <span className="text-[10px] text-gray-500">{z.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-500">
          <TrendingUp className="w-3 h-3" />
          <span>Latest: <span className="text-gray-300 font-medium">{latestScore}/100</span></span>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative h-[200px]">
        <ZoneBands />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
            No discipline data yet — log your first trade to start tracking.
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
