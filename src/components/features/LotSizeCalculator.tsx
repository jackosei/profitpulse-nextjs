"use client";

import { useState, useEffect } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  TRADING_INSTRUMENTS,
  type TradingInstrument,
} from "@/types/tradingInstruments";
import type { Pulse } from "@/types/pulse";

interface LotSizeCalculatorProps {
  pulse?: Pulse;
}

const INSTRUMENT_GROUPS = [
  { label: "Forex", type: "forex" },
  { label: "Indices (CFD)", type: "indices" },
  { label: "Futures", type: "futures" },
  { label: "Metals", type: "metals" },
  { label: "Crypto", type: "crypto" },
] as const;

export default function LotSizeCalculator({ pulse }: LotSizeCalculatorProps) {
  const [formData, setFormData] = useState({
    accountSize: pulse?.accountSize.toString() || "",
    riskPercentage: "1",
    stopLoss: "",
    instrument: pulse?.instruments?.[0] || "",
    lotType: "standard" as "standard" | "mini" | "micro",
  });

  const [selectedInstrument, setSelectedInstrument] = useState<TradingInstrument | null>(
    pulse?.instruments?.[0]
      ? TRADING_INSTRUMENTS.find(i => i.symbol === pulse.instruments[0]) || null
      : null
  );
  const [result, setResult] = useState<{ size: number; riskAmount: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (pulse?.instruments?.[0]) {
      const instrument = TRADING_INSTRUMENTS.find(i => i.symbol === pulse.instruments[0]);
      if (instrument) {
        setSelectedInstrument(instrument);
        setFormData(prev => ({ ...prev, instrument: instrument.symbol }));
      }
    }
  }, [pulse]);

  const isFutures = selectedInstrument?.pipCalculation === "futures";

  const handleInstrumentChange = (symbol: string) => {
    const instrument = TRADING_INSTRUMENTS.find(i => i.symbol === symbol);
    setSelectedInstrument(instrument || null);
    setFormData(prev => ({ ...prev, instrument: symbol, stopLoss: "" }));
    setResult(null);
    setError("");
  };

  const calculatePosition = () => {
    setError("");

    if (!selectedInstrument) {
      setError("Please select a trading instrument");
      return;
    }

    const accountSize = parseFloat(formData.accountSize);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const stopLoss = parseFloat(formData.stopLoss);

    if (isNaN(accountSize) || accountSize <= 0) {
      setError("Please enter a valid account size");
      return;
    }

    if (isNaN(stopLoss) || stopLoss <= 0) {
      setError(`Please enter a valid stop loss in ${isFutures ? "ticks" : selectedInstrument.pipCalculation === "standard" ? "pips" : "points"}`);
      return;
    }

    if (
      isNaN(riskPercentage) ||
      riskPercentage <= 0 ||
      (pulse && riskPercentage > pulse.maxRiskPerTrade)
    ) {
      setError(
        pulse
          ? `Risk percentage must be between 0 and ${pulse.maxRiskPerTrade}%`
          : "Risk percentage must be greater than 0"
      );
      return;
    }

    const riskAmount = (accountSize * riskPercentage) / 100;
    let size: number;

    if (selectedInstrument.pipCalculation === "futures") {
      const tickValue = selectedInstrument.tickValue ?? 1;
      size = riskAmount / (stopLoss * tickValue);
      // Futures are always whole contracts, minimum 1
      size = Math.max(1, Math.floor(size));
    } else if (selectedInstrument.pipCalculation === "standard") {
      if (selectedInstrument.type === "metals") {
        const pipValue = selectedInstrument.pipValue || 0.1;
        const dollarPerPip = riskAmount / stopLoss;
        size = dollarPerPip / (pipValue * 100);
      } else {
        // Forex: $10 per pip per standard lot
        size = (riskAmount / stopLoss) / 10;
      }
    } else {
      // Percentage-based (indices, crypto, silver, platinum)
      size = riskAmount / (stopLoss * selectedInstrument.lotSizeMultiplier);
    }

    if (!isFutures) {
      size = Math.min(
        Math.max(size, selectedInstrument.minLotSize),
        selectedInstrument.maxLotSize
      );
      size = parseFloat(size.toFixed(2));
    }

    setResult({ size, riskAmount });
  };

  const getDisplaySize = () => {
    if (!result || !selectedInstrument) return "";
    if (isFutures) return result.size.toString();
    switch (formData.lotType) {
      case "standard": return result.size.toFixed(2);
      case "mini":     return (result.size * 10).toFixed(1);
      case "micro":    return (result.size * 100).toFixed(0);
    }
  };

  const getLotTypeInfo = (type: "standard" | "mini" | "micro") => {
    switch (type) {
      case "standard": return { label: "Standard Lots", description: "1.0 lot = $10 per pip" };
      case "mini":     return { label: "Mini Lots",     description: "1.0 lot = $1 per pip"  };
      case "micro":    return { label: "Micro Lots",    description: "1.0 lot = $0.10 per pip" };
    }
  };

  const stopLossLabel = isFutures
    ? "Stop Loss (Ticks)"
    : selectedInstrument?.pipCalculation === "standard"
      ? "Stop Loss (Pips)"
      : "Stop Loss (Points)";

  return (
    <div className="bg-dark p-4 rounded-lg border border-gray-800">
      <h2 className="text-lg font-semibold mb-4">Position Size Calculator</h2>

      <div className="space-y-4">
        {/* Instrument Selection — grouped by type */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Trading Instrument</label>
          <select
            className="input-dark w-full"
            value={formData.instrument}
            onChange={e => handleInstrumentChange(e.target.value)}
          >
            <option value="">Select Instrument</option>
            {INSTRUMENT_GROUPS.map(group => {
              const instruments = TRADING_INSTRUMENTS.filter(i => i.type === group.type);
              if (instruments.length === 0) return null;
              return (
                <optgroup key={group.type} label={group.label}>
                  {instruments.map(instrument => (
                    <option key={instrument.symbol} value={instrument.symbol}>
                      {instrument.name} — {instrument.description}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Account Size ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-dark w-full placeholder:text-sm"
              value={formData.accountSize}
              onChange={e => setFormData(prev => ({ ...prev, accountSize: e.target.value }))}
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Risk Percentage (%)</label>
            <input
              type="number"
              min="0.10"
              max={pulse?.maxRiskPerTrade}
              step="0.10"
              className="input-dark w-full placeholder:text-sm"
              value={formData.riskPercentage}
              onChange={e => setFormData(prev => ({ ...prev, riskPercentage: e.target.value }))}
              placeholder="Enter %"
            />
            {pulse && (
              <p className="text-xs text-gray-500 mt-1">Max: {pulse.maxRiskPerTrade}%</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">{stopLossLabel}</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="input-dark w-full placeholder:text-sm"
              value={formData.stopLoss}
              onChange={e => setFormData(prev => ({ ...prev, stopLoss: e.target.value }))}
              placeholder={isFutures ? "Enter ticks" : `Enter ${selectedInstrument?.pipCalculation === "standard" ? "pips" : "points"}`}
            />
            {isFutures && selectedInstrument?.tickSize && (
              <p className="text-xs text-gray-500 mt-1">
                1 tick = {selectedInstrument.tickSize} pts
              </p>
            )}
          </div>

          {/* Lot Type — hidden for futures */}
          {!isFutures && (
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">
                Lot Type
                <span className="ml-2 text-xs text-gray-500">(Select based on your broker&apos;s available lot sizes)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["standard", "mini", "micro"] as const).map(type => {
                  const info = getLotTypeInfo(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, lotType: type }))}
                      className={`p-2 rounded-md border transition-colors ${
                        formData.lotType === type
                          ? "bg-accent/20 border-accent text-accent"
                          : "bg-gray-800/50 border-gray-700 hover:bg-gray-800"
                      }`}
                    >
                      <div className="text-sm font-medium">{info.label}</div>
                      <div className="text-xs text-gray-400">{info.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={calculatePosition}
            className="btn-primary px-4 py-2 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Calculate
          </button>
        </div>

        {result !== null && selectedInstrument && (
          <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Position Size:</p>
                <p className="text-xl font-bold text-accent">
                  {getDisplaySize()}{" "}
                  {isFutures ? "Contract" + (result.size !== 1 ? "s" : "") : getLotTypeInfo(formData.lotType).label}
                </p>
                {isFutures ? (
                  <p className="text-xs text-gray-500 mt-1">
                    1 tick = ${selectedInstrument.tickValue?.toFixed(2)} &nbsp;|&nbsp; min move = {selectedInstrument.tickSize} pts
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {selectedInstrument.minLotSize} | Max: {selectedInstrument.maxLotSize}
                    {selectedInstrument.type === "metals" && (
                      <span className="block mt-1">
                        {formData.lotType === "standard" && `(${result.size * 100} ounces)`}
                        {formData.lotType === "mini"     && `(${result.size * 10} ounces)`}
                        {formData.lotType === "micro"    && `(${result.size} ounces)`}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">Risk Amount:</p>
                <p className="text-xl font-bold text-accent">
                  ${result.riskAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isFutures
                    ? `${result.size} contract${result.size !== 1 ? "s" : ""} × ${parseFloat(formData.stopLoss)} ticks × $${selectedInstrument.tickValue?.toFixed(2)}/tick`
                    : selectedInstrument.pipCalculation === "standard"
                      ? `${(result.riskAmount / parseFloat(formData.stopLoss)).toFixed(2)}$ per pip`
                      : "Based on points calculation"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
