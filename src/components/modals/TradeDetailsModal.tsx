import { TradeDetailsModalProps } from '@/types/pulse';
import { formatCurrency } from '@/utils/format';


export default function TradeDetailsModal({ isOpen, onClose, trade, pulse }: TradeDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="relative bg-dark p-6 rounded-lg border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">Trade Details</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Trade Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-md">
              <div>
                <p className="text-sm text-gray-400">Date</p>
                <p className="text-base text-foreground">{trade.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Instrument</p>
                <p className="text-base text-foreground">{trade.instrument}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className={`text-base ${trade.type === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.type}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Lot Size</p>
                <p className="text-base text-foreground">{trade.lotSize}</p>
              </div>
            </div>
          </div>

          {/* Trade Entry/Exit */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Entry & Exit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-md">
              <div>
                <p className="text-sm text-gray-400">Entry Price</p>
                <p className="text-base text-foreground">{trade.entryPrice}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Exit Price</p>
                <p className="text-base text-foreground">{trade.exitPrice}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Entry Reason</p>
                <p className="text-base text-foreground">{trade.entryReason || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Outcome</p>
                <p className={`text-base ${
                  trade.outcome === 'Win' 
                    ? 'text-success' 
                    : trade.outcome === 'Loss' 
                      ? 'text-error' 
                      : 'text-foreground'
                }`}>
                  {trade.outcome}
                </p>
              </div>
            </div>
          </div>

          {/* Trade Performance */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-md">
              <div>
                <p className="text-sm text-gray-400">Profit/Loss</p>
                <p className={`text-base ${trade.profitLoss >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(trade.profitLoss)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Profit/Loss %</p>
                <p className={`text-base ${trade.profitLossPercentage >= 0 ? 'text-success' : 'text-error'}`}>
                  {trade.profitLossPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Learnings */}
          {trade.learnings && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Learnings & Notes</h3>
              <div className="bg-gray-800/30 p-4 rounded-md">
                <p className="text-base text-foreground whitespace-pre-line">{trade.learnings}</p>
              </div>
            </div>
          )}

          {/* Rules Followed Section */}
          {trade.followedRules && trade.followedRules.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Rules Followed</h3>
              <div className="space-y-2 bg-dark-lighter p-3 rounded-lg">
                {trade.followedRules.map((ruleId, index) => {
                  // Find the rule in the pulse's trading rules if available
                  const ruleDetails = pulse?.tradingRules?.find(r => r.id === ruleId);
                  
                  return (
                    <div key={index} className="flex items-center gap-2 p-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>
                        {ruleDetails?.description || `Rule ${index + 1}`}
                        {ruleDetails?.isRequired && (
                          <span className="ml-2 text-xs text-accent">(Required)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 