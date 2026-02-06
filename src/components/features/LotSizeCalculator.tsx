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

export default function LotSizeCalculator({ pulse }: LotSizeCalculatorProps) {
  const [formData, setFormData] = useState({
    accountSize: pulse?.accountSize.toString() || "",
    riskPercentage: "1", // Default to 1% risk
    stopLossPips: "",
    instrument: pulse?.instruments?.[0] || "", // Pre-select first instrument if in pulse
    lotType: "standard" as "standard" | "mini" | "micro",
  });

  const [selectedInstrument, setSelectedInstrument] = useState<TradingInstrument | null>(
    pulse?.instruments?.[0] 
      ? TRADING_INSTRUMENTS.find(i => i.symbol === pulse.instruments[0]) || null 
      : null
  );
  const [lotSize, setLotSize] = useState<number | null>(null);
  const [riskAmount, setRiskAmount] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Update selected instrument when pulse changes
  useEffect(() => {
    if (pulse?.instruments?.[0]) {
      const instrument = TRADING_INSTRUMENTS.find(i => i.symbol === pulse.instruments[0]);
      if (instrument) {
        setSelectedInstrument(instrument);
        setFormData(prev => ({
          ...prev,
          instrument: instrument.symbol
        }));
      }
    }
  }, [pulse]);

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
    if (isNaN(accountSize) || accountSize <= 0) {
      setError("Please enter a valid account size");
      return;
    }

    if (isNaN(stopLossPips) || stopLossPips <= 0) {
      setError("Please enter a valid stop loss in pips/points");
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

    // Calculate risk amount in currency
    const maxRiskAmount = (accountSize * riskPercentage) / 100;
    setRiskAmount(maxRiskAmount);

    let calculatedLotSize: number;

    if (selectedInstrument.pipCalculation === "standard") {
      // For forex pairs and metals with standard pip calculation
      let pipValue: number;
      
      if (selectedInstrument.type === "metals") {
        // For metals (XAUUSD, XAGUSD)
        // Metals use fixed pip values per ounce
        pipValue = selectedInstrument.pipValue || 0.1; // Default to $0.10 for gold
        const dollarPerPip = maxRiskAmount / stopLossPips;
        calculatedLotSize = dollarPerPip / (pipValue * 100); // Convert to standard lots (100 oz)
      } else {
        // For forex pairs
        pipValue = 10; // $10 per pip for 1.0 standard lot
        const dollarPerPip = maxRiskAmount / stopLossPips;
        calculatedLotSize = dollarPerPip / pipValue;
      }
    } else {
      // For indices and other instruments with percentage-based calculation
      calculatedLotSize =
        maxRiskAmount / (stopLossPips * selectedInstrument.lotSizeMultiplier);
    }

    // Ensure lot size is within instrument limits
    calculatedLotSize = Math.min(
      Math.max(calculatedLotSize, selectedInstrument.minLotSize),
      selectedInstrument.maxLotSize
    );

    // Round to appropriate decimal places based on instrument type
    const decimals = selectedInstrument.type === "metals" ? 2 : 2;
    setLotSize(parseFloat(calculatedLotSize.toFixed(decimals)));
  };

  // Function to convert and format display value
  const getDisplayValue = () => {
    if (!lotSize || !selectedInstrument) return "";

    // Convert lot size based on selected lot type for all instruments
    switch (formData.lotType) {
      case "standard":
        return lotSize.toFixed(2);
      case "mini":
        return (lotSize * 10).toFixed(1);
      case "micro":
        return (lotSize * 100).toFixed(0);
    }
  };

  // Add this function after the existing state declarations
  const getLotTypeInfo = (type: "standard" | "mini" | "micro") => {
    switch (type) {
      case "standard":
        return {
          label: "Standard Lots",
          description: "1.0 lot = $10 per pip",
          multiplier: 1,
        };
      case "mini":
        return {
          label: "Mini Lots",
          description: "1.0 lot = $1 per pip",
          multiplier: 0.1,
        };
      case "micro":
        return {
          label: "Micro Lots",
          description: "1.0 lot = $0.10 per pip",
          multiplier: 0.01,
        };
    }
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
            {TRADING_INSTRUMENTS.map((instrument) => (
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
              type="number"
              min="0"
              step="0.01"
              className="input-dark w-full placeholder:text-sm"
              value={formData.accountSize}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  accountSize: e.target.value,
                }))
              }
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Risk Percentage (%)
            </label>
            <input
              type="number"
              min="0.10"
              max={pulse?.maxRiskPerTrade}
              step="0.10"
              className="input-dark w-full placeholder:text-sm"
              value={formData.riskPercentage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  riskPercentage: e.target.value,
                }))
              }
              placeholder="Enter %"
            />
            {pulse && (
              <p className="text-xs text-gray-500 mt-1">
                Max: {pulse.maxRiskPerTrade}%
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">
              Stop Loss (
              {selectedInstrument?.pipCalculation === "standard" ? "Pips" : "Points"})
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="input-dark w-full placeholder:text-sm"
              value={formData.stopLossPips}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  stopLossPips: e.target.value,
                }))
              }
              placeholder={`Enter ${selectedInstrument?.pipCalculation === "standard" ? "pips" : "points"}`}
            />
          </div>

          {/* Lot Type Selection - Always show */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">
              Lot Type
              <span className="ml-2 text-xs text-gray-500">
                (Select based on your broker&apos;s available lot sizes)
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["standard", "mini", "micro"] as const).map((type) => {
                const info = getLotTypeInfo(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        lotType: type,
                      }))
                    }
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
                  {getDisplayValue()} {getLotTypeInfo(formData.lotType).label}
                </p>
                {selectedInstrument && (
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {selectedInstrument.minLotSize} | Max: {selectedInstrument.maxLotSize}
                    {selectedInstrument.type === "metals" && (
                      <span className="block mt-1">
                        {formData.lotType === "standard" && `(${lotSize * 100} ounces)`}
                        {formData.lotType === "mini" && `(${lotSize * 10} ounces)`}
                        {formData.lotType === "micro" && `(${lotSize} ounces)`}
                      </span>
                    )}
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
                      ? `${(riskAmount / parseFloat(formData.stopLossPips)).toFixed(2)}$ per pip`
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
