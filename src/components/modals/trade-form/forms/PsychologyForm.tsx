import type { FormComponentProps } from "../types";

export default function PsychologyForm({
  formData,
  onChange,
  isSubmitting,
}: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Emotional State
          </label>
          <select
            name="emotionalState"
            disabled={isSubmitting}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
            value={formData.emotionalState}
            onChange={onChange}
          >
            <option value="">Select Emotional State</option>
            <option value="Calm">Calm</option>
            <option value="Excited">Excited</option>
            <option value="Fearful">Fearful</option>
            <option value="Greedy">Greedy</option>
            <option value="Anxious">Anxious</option>
            <option value="Confident">Confident</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Mental State
          </label>
          <select
            name="mentalState"
            disabled={isSubmitting}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
            value={formData.mentalState}
            onChange={onChange}
          >
            <option value="">Select Mental State</option>
            <option value="Clear">Clear</option>
            <option value="Distracted">Distracted</option>
            <option value="Tired">Tired</option>
            <option value="Focused">Focused</option>
            <option value="Rushed">Rushed</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Emotional Intensity (1-10)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            name="emotionalIntensity"
            min="1"
            max="10"
            disabled={isSubmitting}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            value={formData.emotionalIntensity}
            onChange={onChange}
          />
          <span
            className={`text-sm font-medium w-8 text-center rounded-full h-8 flex items-center justify-center
            ${
              Number(formData.emotionalIntensity) <= 3
                ? "bg-green-500/20 text-green-400"
                : Number(formData.emotionalIntensity) <= 7
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
            }`}
          >
            {formData.emotionalIntensity}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low Intensity</span>
          <span>High Intensity</span>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Trading Plan Adherence
        </label>
        <select
          name="planAdherence"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.planAdherence}
          onChange={onChange}
        >
          <option value="">Select Plan Adherence</option>
          <option value="Fully">Fully followed my plan</option>
          <option value="Partially">Partially followed my plan</option>
          <option value="Deviated">Deviated from my plan</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          name="impulsiveEntry"
          id="impulsiveEntry"
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-700 bg-dark text-blue-600 focus:ring-blue-500"
          checked={formData.impulsiveEntry}
          onChange={onChange}
        />
        <label htmlFor="impulsiveEntry" className="text-sm text-gray-300">
          This was an impulse trade (not planned in advance)
        </label>
      </div>
    </div>
  );
}
