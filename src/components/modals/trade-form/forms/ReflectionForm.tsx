import type { FormComponentProps } from "../types";

export default function ReflectionForm({
  formData,
  onChange,
  isSubmitting,
}: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          name="wouldRepeat"
          id="wouldRepeat"
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-700 bg-dark text-blue-600 focus:ring-blue-500"
          checked={formData.wouldRepeat}
          onChange={onChange}
        />
        <label htmlFor="wouldRepeat" className="text-sm text-gray-300">
          I would make this same trade again
        </label>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Emotional Impact
        </label>
        <select
          name="emotionalImpact"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.emotionalImpact}
          onChange={onChange}
        >
          <option value="">Select Emotional Impact</option>
          <option value="Positive">Positive - Increased confidence</option>
          <option value="Negative">Negative - Decreased confidence</option>
          <option value="Neutral">Neutral - No significant impact</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Mistakes Identified
        </label>
        <textarea
          name="mistakesIdentified"
          disabled={isSubmitting}
          className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.mistakesIdentified}
          onChange={onChange}
          placeholder="Separate multiple mistakes with commas"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Ideas for Improvement
        </label>
        <textarea
          name="improvementIdeas"
          disabled={isSubmitting}
          className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.improvementIdeas}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
