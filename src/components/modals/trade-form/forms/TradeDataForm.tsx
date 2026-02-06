import { useRef } from "react";
import { TRADING_INSTRUMENTS } from "@/types/tradingInstruments";
import type { FormComponentProps } from "../types";

interface TradeDataFormProps extends FormComponentProps {
  availableInstruments: string[];
  onTimeChange: (
    name: string,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function TradeDataForm({
  formData,
  onChange,
  isSubmitting,
  availableInstruments,
  onTimeChange,
}: TradeDataFormProps) {
  const entryTimeRef = useRef<HTMLInputElement>(null);
  const exitTimeRef = useRef<HTMLInputElement>(null);
  const entryPriceRef = useRef<HTMLInputElement>(null);
  const exitPriceRef = useRef<HTMLInputElement>(null);
  const profitLossRef = useRef<HTMLInputElement>(null);

  const getInstrumentName = (symbol: string) => {
    const instrument = TRADING_INSTRUMENTS.find((i) => i.symbol === symbol);
    return instrument
      ? `${instrument.name} - ${instrument.description}`
      : symbol;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            id="trade-date"
            required
            disabled={isSubmitting}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
            value={formData.date}
            onChange={onChange}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Instrument <span className="text-red-500">*</span>
          </label>
          <select
            required
            name="instrument"
            disabled={isSubmitting || availableInstruments.length === 0}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
            value={formData.instrument}
            onChange={onChange}
          >
            <option value="">Select Instrument</option>
            {availableInstruments.map((instrument) => (
              <option key={instrument} value={instrument}>
                {getInstrumentName(instrument)}
              </option>
            ))}
          </select>
          {availableInstruments.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No instruments configured. Please update pulse settings.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Entry Time / Exit Time
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              name="entryTime"
              id="entry-time"
              ref={entryTimeRef}
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
              value={formData.entryTime}
              onChange={onTimeChange("entryTime")}
            />
            <input
              type="time"
              name="exitTime"
              id="exit-time"
              ref={exitTimeRef}
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
              value={formData.exitTime}
              onChange={onTimeChange("exitTime")}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Type / Lot Size <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              required
              name="type"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
              value={formData.type}
              onChange={onChange}
            >
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
            <input
              type="number"
              name="lotSize"
              required
              step="0.01"
              min="0.01"
              placeholder="Lot Size"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.lotSize}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Entry Price / Exit Price <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="entryPrice"
              id="entry-price"
              ref={entryPriceRef}
              required
              step="0.00001"
              min="0.00001"
              placeholder="Entry"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.entryPrice}
              onChange={onChange}
            />
            <input
              type="number"
              name="exitPrice"
              id="exit-price"
              ref={exitPriceRef}
              required
              step="0.00001"
              min="0.00001"
              placeholder="Exit"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.exitPrice}
              onChange={onChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Profit/Loss ($) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              name="profitLoss"
              id="profit-loss"
              ref={profitLossRef}
              required
              step="0.01"
              disabled={isSubmitting}
              className={`input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed pl-9 ${
                parseFloat(formData.profitLoss) > 0
                  ? "border-green-500/50 focus:border-green-500"
                  : parseFloat(formData.profitLoss) < 0
                    ? "border-red-500/50 focus:border-red-500"
                    : ""
              }`}
              value={formData.profitLoss}
              onChange={onChange}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span
                className={`text-lg ${
                  parseFloat(formData.profitLoss) > 0
                    ? "text-green-500"
                    : parseFloat(formData.profitLoss) < 0
                      ? "text-red-500"
                      : "text-gray-500"
                }`}
              >
                $
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter positive value for profit, negative for loss
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Entry Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          name="entryReason"
          disabled={isSubmitting}
          className="input-dark w-full h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.entryReason}
          onChange={onChange}
        />
      </div>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <h3 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
          Trade Screenshots
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Entry Screenshot URL
            </label>
            <input
              type="text"
              name="entryScreenshot"
              placeholder="Paste image URL here"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.entryScreenshot}
              onChange={onChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your entry position screenshot
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Exit Screenshot URL
            </label>
            <input
              type="text"
              name="exitScreenshot"
              placeholder="Paste image URL here"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.exitScreenshot}
              onChange={onChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your exit position screenshot
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Notes & Learnings
        </label>
        <textarea
          name="learnings"
          disabled={isSubmitting}
          className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.learnings}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
