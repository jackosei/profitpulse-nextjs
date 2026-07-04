import type { FormComponentProps } from "../types";

export default function ContextForm({
  formData,
  onChange,
  isSubmitting,
}: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Market Condition
        </label>
        <select
          name="marketCondition"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.marketCondition}
          onChange={onChange}
        >
          <option value="">Select Market Condition</option>
          <option value="Trending">Trending</option>
          <option value="Ranging">Ranging</option>
          <option value="Volatile">Volatile</option>
          <option value="Calm">Calm</option>
          <option value="News-driven">News-driven</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Time of Day</label>
        <select
          name="timeOfDay"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.timeOfDay}
          onChange={onChange}
        >
          <option value="">Select Time of Day</option>
          <option value="Early Morning">Early Morning</option>
          <option value="Morning Session">Morning Session</option>
          <option value="Midday">Midday</option>
          <option value="Afternoon Session">Afternoon Session</option>
          <option value="Late Afternoon">Late Afternoon</option>
          <option value="Evening">Evening</option>
          <option value="Overnight">Overnight</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Trading Environment
        </label>
        <select
          name="tradingEnvironment"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.tradingEnvironment}
          onChange={onChange}
        >
          <option value="">Select Environment</option>
          <option value="Home">Home</option>
          <option value="Office">Office</option>
          <option value="Mobile">Mobile</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
  );
}
