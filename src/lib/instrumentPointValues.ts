/**
 * Instrument Point Value Lookup
 *
 * Maps common instrument symbols to their dollar value per 1 point/pip
 * of price movement per 1 contract/lot.
 *
 * Used to auto-populate the pointValue field at Pulse creation.
 * The user can override any value if it doesn't match their broker.
 *
 * Forex values assume a standard lot (100,000 units).
 * Futures values are the official CME/exchange multipliers.
 * Stocks and crypto default to 1 (price in USD, 1 share = $1/point).
 */

export const INSTRUMENT_POINT_VALUES: Record<string, number> = {
  // -------------------------------------------------------------------------
  // US Index Futures (CME / CME Globex)
  // -------------------------------------------------------------------------
  NQ:   20,    // E-mini Nasdaq-100   ($20/pt/contract)
  MNQ:   2,    // Micro Nasdaq-100    ($2/pt/contract)
  ES:   50,    // E-mini S&P 500      ($50/pt/contract)
  MES:   5,    // Micro S&P 500       ($5/pt/contract)
  YM:    5,    // E-mini Dow          ($5/pt/contract)
  MYM:   0.5,  // Micro Dow           ($0.50/pt/contract)
  RTY:  50,    // E-mini Russell 2000 ($50/pt/contract)
  M2K:   5,    // Micro Russell 2000  ($5/pt/contract)

  // -------------------------------------------------------------------------
  // Commodity Futures
  // -------------------------------------------------------------------------
  GC:  100,    // Gold               ($100/troy oz/contract)
  MGC:  10,    // Micro Gold          ($10/troy oz/contract)
  SI:   50,    // Silver             ($50/oz/contract — 5,000 oz × $0.01/oz = $50)
  CL: 1000,    // Crude Oil WTI      ($1,000/dollar/contract)
  NG:  100,    // Natural Gas        ($100 per $0.001/mmbtu × 100 = $10,000 per dollar — simplified to $100 per 0.1)
  HG:  250,    // Copper             ($250/lb/contract — 25,000 lbs × $0.01 = $250)

  // -------------------------------------------------------------------------
  // Forex — Standard Lot (100,000 units). USD-quoted pairs = $10/pip.
  // Cross pairs are approximate for USD-account traders.
  // -------------------------------------------------------------------------
  EURUSD:  10,
  GBPUSD:  10,
  AUDUSD:  10,
  NZDUSD:  10,
  USDCAD:  10,   // approx — depends on CAD/USD rate
  USDCHF:  10,   // approx — depends on CHF/USD rate
  USDJPY:  10,   // approx — $10/pip for 100-pip = 1 yen move
  EURGBP:  13,   // approx — GBP-quoted pair
  EURJPY:  10,
  GBPJPY:  10,
  XAUUSD:  10,   // Spot Gold (forex broker — 1 lot = 100 oz, $10/pip for 0.1 pip)

  // -------------------------------------------------------------------------
  // Crypto — typically 1 contract = 1 coin or 0.1 coin depending on broker
  // These are broker-specific; default to 1 as a safe fallback.
  // -------------------------------------------------------------------------
  BTCUSD:   1,
  ETHUSD:   1,
};

/**
 * Returns the known point value for a symbol, or 1 as a default
 * (correct for USD-denominated stocks and unknown instruments).
 */
export function getDefaultPointValue(symbol: string): number {
  const normalised = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return INSTRUMENT_POINT_VALUES[normalised] ?? 1;
}
