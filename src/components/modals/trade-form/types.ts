// Shared types for trade form components

export type EmotionalState =
  | "Calm"
  | "Excited"
  | "Fearful"
  | "Greedy"
  | "Anxious"
  | "Confident"
  | "Other";
export type MentalState =
  | "Clear"
  | "Distracted"
  | "Tired"
  | "Focused"
  | "Rushed"
  | "Other";
export type PlanAdherence = "Fully" | "Partially" | "Deviated";
export type MarketCondition =
  | "Trending"
  | "Ranging"
  | "Volatile"
  | "Calm"
  | "News-driven";
export type TradingEnvironment = "Home" | "Office" | "Mobile" | "Other";
export type EmotionalImpact = "Positive" | "Negative" | "Neutral";

export interface TradeFormData {
  // Trade tab
  date: string;
  entryTime: string;
  exitTime: string;
  type: string;
  lotSize: string;
  entryPrice: string;
  exitPrice: string;
  entryReason: string;
  profitLoss: string;
  learnings: string;
  instrument: string;
  entryScreenshot: string;
  exitScreenshot: string;

  // Psychology tab
  emotionalState: string;
  emotionalIntensity: number;
  mentalState: string;
  planAdherence: string;
  impulsiveEntry: boolean;

  // Context tab
  marketCondition: string;
  timeOfDay: string;
  tradingEnvironment: string;

  // Reflection tab
  wouldRepeat: boolean;
  emotionalImpact: string;
  mistakesIdentified: string;
  improvementIdeas: string;
}

export interface FormComponentProps {
  formData: TradeFormData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  isSubmitting: boolean;
}
