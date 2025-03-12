import { Pulse } from '@/types/pulse';
import { formatCurrency, formatRatio } from '@/utils/format';

interface PulseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulse: Pulse;
}

export default function PulseDetailsModal({ isOpen, onClose, pulse }: PulseDetailsModalProps) {
  if (!isOpen) return null;

  // Calculate risk indicators
  const dailyLoss = pulse.dailyLoss || {};
  const todayKey = new Date().toISOString().split('T')[0];
  const todayLoss = dailyLoss[todayKey] || 0;
  const todayLossPercentage = (todayLoss / pulse.accountSize) * 100;
  const totalDrawdownPercentage = ((pulse.totalDrawdown || 0) / pulse.accountSize) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="relative bg-dark p-6 rounded-lg border border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">{pulse.name} Details</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-md">
              <div>
                <p className="text-sm text-gray-400">Account Size</p>
                <p className="text-base text-foreground">{formatCurrency(pulse.accountSize)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Instruments</p>
                <p className="text-base text-foreground">
                  {Array.isArray(pulse.instruments) ? pulse.instruments.join(', ') : 'No instruments'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`text-base ${pulse.status === 'locked' ? 'text-red-500' : 'text-foreground'}`}>
                  {pulse.status.charAt(0).toUpperCase() + pulse.status.slice(1)}
                  {pulse.status === 'locked' && ' 🔒'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-base text-foreground">
                  {pulse.createdAt ? new Date(pulse.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Parameters */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Risk Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-md">
              <div>
                <p className="text-sm text-gray-400">Max Risk Per Trade</p>
                <p className="text-base text-foreground">{pulse.maxRiskPerTrade}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Max Daily Drawdown</p>
                <p className="text-base text-foreground">{pulse.maxDailyDrawdown}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Max Total Drawdown</p>
                <p className="text-base text-foreground">{pulse.maxTotalDrawdown}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Current Today's Loss</p>
                <p className={`text-base ${todayLossPercentage > 0 ? 'text-error' : 'text-foreground'}`}>
                  {formatCurrency(todayLoss)} ({todayLossPercentage.toFixed(1)}%)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Current Total Drawdown</p>
                <p className={`text-base ${totalDrawdownPercentage > 0 ? 'text-error' : 'text-foreground'}`}>
                  {formatCurrency(pulse.totalDrawdown || 0)} ({totalDrawdownPercentage.toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>

          {/* Performance Statistics */}
          {pulse.stats && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Performance Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800/30 p-4 rounded-md">
                <div>
                  <p className="text-sm text-gray-400">Total Trades</p>
                  <p className="text-base text-foreground">{pulse.stats.totalTrades}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Wins</p>
                  <p className="text-base text-foreground">{pulse.stats.wins}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Losses</p>
                  <p className="text-base text-foreground">{pulse.stats.losses}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Strike Rate</p>
                  <p className="text-base text-foreground">
                    {pulse.stats.totalTrades > 0
                      ? formatRatio((pulse.stats.wins / pulse.stats.totalTrades) * 100, { suffix: "%", decimals: 1 })
                      : "0%"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total P/L</p>
                  <p className={`text-base ${pulse.stats.totalProfitLoss >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(pulse.stats.totalProfitLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Profit Factor</p>
                  <p className="text-base text-foreground">
                    {pulse.stats.profitFactor ? pulse.stats.profitFactor.toFixed(2) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Average Win</p>
                  <p className="text-base text-success">
                    {formatCurrency(pulse.stats.averageWin)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Average Loss</p>
                  <p className="text-base text-error">
                    {formatCurrency(Math.abs(pulse.stats.averageLoss))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rule Violations */}
          {pulse.ruleViolations && pulse.ruleViolations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Rule Violations</h3>
              <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-md">
                <ul className="list-disc pl-5 space-y-1">
                  {pulse.ruleViolations.map((violation, index) => (
                    <li key={index} className="text-red-400">{violation}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Notes */}
          {pulse.note && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Notes</h3>
              <div className="bg-gray-800/30 p-4 rounded-md">
                <p className="text-base text-foreground whitespace-pre-line">{pulse.note}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 