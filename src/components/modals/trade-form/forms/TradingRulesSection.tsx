import { CheckIcon } from "@heroicons/react/24/outline";
import type { Pulse } from "@/types/pulse";

interface TradingRulesSectionProps {
  pulse: Pulse | null;
  followedRules: string[];
  onRuleToggle: (ruleId: string) => void;
  isSubmitting: boolean;
}

export default function TradingRulesSection({
  pulse,
  followedRules,
  onRuleToggle,
  isSubmitting,
}: TradingRulesSectionProps) {
  if (!pulse?.tradingRules || pulse.tradingRules.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Trading Rules Checklist
      </h3>
      <div className="space-y-2 border border-gray-800 rounded-lg p-4 bg-gray-900/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pulse.tradingRules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-start gap-2 p-2 rounded-md transition-colors ${
                followedRules.includes(rule.id)
                  ? "bg-green-900/20 border border-green-800/40"
                  : "hover:bg-gray-800/50"
              }`}
            >
              <button
                type="button"
                onClick={() => onRuleToggle(rule.id)}
                disabled={isSubmitting}
                className={`flex-shrink-0 h-5 w-5 mt-0.5 rounded border ${
                  followedRules.includes(rule.id)
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-dark border-gray-700"
                } flex items-center justify-center`}
              >
                {followedRules.includes(rule.id) && (
                  <CheckIcon className="h-3 w-3 text-white" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    {rule.description}
                    {rule.isRequired && (
                      <span className="ml-1 text-red-500 text-xs">*</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800 text-xs text-gray-400">
          <div>
            Required rules:{" "}
            {pulse.tradingRules.filter((r) => r.isRequired).length}
          </div>
          <div>
            Checked: {followedRules.length}/{pulse.tradingRules.length}
          </div>
        </div>
      </div>
    </div>
  );
}
