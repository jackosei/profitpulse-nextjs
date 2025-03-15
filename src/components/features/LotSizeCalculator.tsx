"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  TRADING_INSTRUMENTS,
  type TradingInstrument,
} from "@/types/tradingInstruments";
import type { Pulse } from "@/types/pulse";
import { formatCurrency } from "@/utils/format";
interface LotSizeCalculatorProps {
  pulse: Pulse;
}

export default function LotSizeCalculator({ pulse }: LotSizeCalculatorProps) {
  const [formData, setFormData] = useState({
    accountSize: pulse.accountSize.toString(),
    riskPercentage: "1",
    stopLossPips: "",
    instrument: "",
    lotType: "standard" as "standard" | "mini" | "micro",
  });

  const [selectedInstrument, setSelectedInstrument] =
    useState<TradingInstrument | null>(null);
  const [lotSize, setLotSize] = useState<number | null>(null);
  const [riskAmount, setRiskAmount] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Memoize pulseInstruments
  const pulseInstruments = useMemo(
    () => (Array.isArray(pulse.instruments) ? pulse.instruments : []),
    [pulse.instruments]
  );

  // Filter trading instruments based on pulse configuration
  const availableInstruments = TRADING_INSTRUMENTS.filter((instrument) =>
    pulseInstruments.includes(instrument.symbol)
  );

  // Auto-select instrument if pulse has only one
  useEffect(() => {
    if (pulseInstruments.length === 1) {
      const defaultInstrument = TRADING_INSTRUMENTS.find(
        (i) => i.symbol === pulseInstruments[0]
      );
      if (defaultInstrument) {
        setSelectedInstrument(defaultInstrument);
        setFormData((prev) => ({
          ...prev,
          instrument: defaultInstrument.symbol,
        }));
      }
    }
  }, [pulseInstruments]);

  // If no instruments are available, show a message
  if (availableInstruments.length === 0) {
    return (
      <div className="bg-dark p-4 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Position Size Calculator</h2>
        <div className="p-4 bg-red-900/50 border border-red-800 rounded-lg">
          <p className="text-red-500">
            No trading instruments configured for this pulse. Please configure
            instruments in pulse settings.
          </p>
        </div>
      </div>
    );
  }

  const handleInstrumentChange = (symbol: string) => {
    const instrument = TRADING_INSTRUMENTS.find((i) => i.symbol === symbol);
    setSelectedInstrument(instrument || null);
    setFormData((prev) => ({ ...prev, instrument: symbol }));
  };

  const calculateLotSize = () => {
    setError("");

    if (!selectedInstrument) {
      setError("Please select a trading instrument");
      return;
    }

    const accountSize = parseFloat(formData.accountSize);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const stopLossPips = parseFloat(formData.stopLossPips);

    // Validation
    if (isNaN(stopLossPips) || stopLossPips <= 0) {
      setError("Please enter a valid stop loss in pips/points");
      return;
    }

    if (
      isNaN(riskPercentage) ||
      riskPercentage <= 0 ||
      riskPercentage > pulse.maxRiskPerTrade
    ) {
      setError(
        `Risk percentage must be between 0 and ${pulse.maxRiskPerTrade}%`
      );
      return;
    }

    // Calculate risk amount in currency
    const maxRiskAmount = (accountSize * riskPercentage) / 100;
    setRiskAmount(maxRiskAmount);

    let calculatedLotSize: number;

    if (selectedInstrument.pipCalculation === "standard") {
      // For forex pairs
      const standardLotPipValue = 10; // $10 per pip for 1.0 standard lot
      const dollarPerPip = maxRiskAmount / stopLossPips;
      calculatedLotSize = dollarPerPip / standardLotPipValue;

      // No conversion during calculation - keep everything in standard lots
      // We'll only convert for display purposes
    } else {
      // For instruments with percentage-based calculation
      calculatedLotSize =
        maxRiskAmount / (stopLossPips * selectedInstrument.lotSizeMultiplier);
    }

    // Ensure lot size is within instrument limits in standard lots
    calculatedLotSize = Math.min(
      Math.max(calculatedLotSize, selectedInstrument.minLotSize),
      selectedInstrument.maxLotSize
    );

    // Round to 2 decimal places for standard lots
    setLotSize(parseFloat(calculatedLotSize.toFixed(2)));
  };

  // Function to convert and format display value
  const getDisplayValue = () => {
    if (!lotSize || !selectedInstrument) return "";

    if (selectedInstrument.pipCalculation === "standard") {
      // For display purposes, convert standard lots to selected lot type
      switch (formData.lotType) {
        case "standard":
          return lotSize.toFixed(2);
        case "mini":
          return (lotSize * 10).toFixed(1);
        case "micro":
          return (lotSize * 100).toFixed(0);
      }
    }
    return lotSize.toFixed(2);
  };

  return (
    <div className="bg-dark p-4 rounded-lg border border-gray-800">
      <h2 className="text-lg font-semibold mb-4">Position Size Calculator</h2>

      <div className="space-y-4">
        {/* Instrument Selection */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Trading Instrument
          </label>
          <select
            className="input-dark w-full"
            value={formData.instrument}
            onChange={(e) => handleInstrumentChange(e.target.value)}
          >
            <option value="">Select Instrument</option>
            {availableInstruments.map((instrument) => (
              <option key={instrument.symbol} value={instrument.symbol}>
                {instrument.name} - {instrument.description}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Account Size ($)
            </label>
            <input
              type="text"
              className="input-dark w-full"
              value={formatCurrency(formData.accountSize, {
                decimals: 0,
                prefix: "$",
              })}
              disabled
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Risk Percentage (%)
            </label>
            <input
              type="number"
              min="0.10"
              max={pulse.maxRiskPerTrade}
              step="0.10"
              className="input-dark w-full"
              value={formData.riskPercentage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  riskPercentage: e.target.value,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Max: {pulse.maxRiskPerTrade}%
            </p>
          </div>

          <div
            className={
              selectedInstrument?.pipCalculation === "standard"
                ? "md:col-span-1"
                : "md:col-span-2"
            }
          >
            <label className="block text-sm text-gray-400 mb-2">
              Stop Loss (
              {selectedInstrument?.pipCalculation === "standard"
                ? "Pips"
                : "Points"}
              )
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="input-dark w-full"
              value={formData.stopLossPips}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  stopLossPips: e.target.value,
                }))
              }
              placeholder={`Enter ${
                selectedInstrument?.pipCalculation === "standard"
                  ? "pips"
                  : "points"
              }`}
            />
          </div>

          {selectedInstrument?.pipCalculation === "standard" && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Lot Type
              </label>
              <select
                className="input-dark w-full"
                value={formData.lotType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lotType: e.target.value as "standard" | "mini" | "micro",
                  }))
                }
              >
                <option value="standard">Standard Lots</option>
                <option value="mini">Mini Lots</option>
                <option value="micro">Micro Lots</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.lotType === "standard"
                  ? "1.0 lot = $10 per pip"
                  : formData.lotType === "mini"
                  ? "1.0 lot = $1 per pip"
                  : "1.0 lot = $0.10 per pip"}
              </p>
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
            onClick={calculateLotSize}
            className="btn-primary px-4 py-2 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Calculate
          </button>
        </div>

        {lotSize !== null && riskAmount !== null && (
          <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Position Size:</p>
                <p className="text-xl font-bold text-accent">
                  {getDisplayValue()}
                </p>

                {selectedInstrument && (
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {selectedInstrument.minLotSize} | Max:{" "}
                    {selectedInstrument.maxLotSize}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">Risk Amount:</p>
                <p className="text-xl font-bold text-accent">
                  ${riskAmount.toFixed(2)}
                </p>
                {selectedInstrument && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedInstrument.pipCalculation === "standard"
                      ? `${(
                          riskAmount / parseFloat(formData.stopLossPips)
                        ).toFixed(2)}$ per pip`
                      : "Based on points calculation"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
