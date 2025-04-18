export interface TradingInstrument {
    name: string;
    symbol: string;
    type: 'forex' | 'metals' | 'indices' | 'crypto';
    lotSizeMultiplier: number;
    pipCalculation: 'standard' | 'percentage';
    pipValue?: number;
    minLotSize: number;
    maxLotSize: number;
    description: string;
  }
  
  export const TRADING_INSTRUMENTS: TradingInstrument[] = [
    // Major Forex Pairs
    {
      name: 'EUR/USD',
      symbol: 'EUR/USD',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'Euro vs US Dollar'
    },
    {
      name: 'GBP/USD',
      symbol: 'GBP/USD',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'British Pound vs US Dollar'
    },
    {
      name: 'USD/JPY',
      symbol: 'USD/JPY',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.01,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'US Dollar vs Japanese Yen'
    },
    {
      name: 'USD/CHF',
      symbol: 'USD/CHF',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'US Dollar vs Swiss Franc'
    },
    {
      name: 'AUD/USD',
      symbol: 'AUD/USD',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'Australian Dollar vs US Dollar'
    },
    {
      name: 'USD/CAD',
      symbol: 'USD/CAD',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'US Dollar vs Canadian Dollar'
    },
    {
      name: 'NZD/USD',
      symbol: 'NZD/USD',
      type: 'forex',
      lotSizeMultiplier: 100000,
      pipCalculation: 'standard',
      pipValue: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'New Zealand Dollar vs US Dollar'
    },

    // Major Indices
    {
      name: 'US30',
      symbol: 'US30',
      type: 'indices',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.1,
      maxLotSize: 100,
      description: 'Dow Jones Industrial Average'
    },
    {
      name: 'SPX500',
      symbol: 'SPX500',
      type: 'indices',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.1,
      maxLotSize: 100,
      description: 'S&P 500 Index'
    },
    {
      name: 'NAS100',
      symbol: 'NAS100',
      type: 'indices',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.1,
      maxLotSize: 100,
      description: 'Nasdaq 100 Index'
    },
    {
      name: 'GER40',
      symbol: 'GER40',
      type: 'indices',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.1,
      maxLotSize: 100,
      description: 'German DAX 40'
    },
    {
      name: 'UK100',
      symbol: 'UK100',
      type: 'indices',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.1,
      maxLotSize: 100,
      description: 'FTSE 100 Index'
    },

    // Metals
    {
      name: 'XAU/USD',
      symbol: 'XAU/USD',
      type: 'metals',
      lotSizeMultiplier: 100,
      pipCalculation: 'standard',
      pipValue: 0.1,
      minLotSize: 0.01,
      maxLotSize: 50,
      description: 'Gold vs US Dollar'
    },
    {
      name: 'XAG/USD',
      symbol: 'XAG/USD',
      type: 'metals',
      lotSizeMultiplier: 5000,
      pipCalculation: 'percentage',
      minLotSize: 0.01,
      maxLotSize: 50,
      description: 'Silver vs US Dollar'
    },
    {
      name: 'XPT/USD',
      symbol: 'XPT/USD',
      type: 'metals',
      lotSizeMultiplier: 100,
      pipCalculation: 'percentage',
      minLotSize: 0.01,
      maxLotSize: 50,
      description: 'Platinum vs US Dollar'
    },

    // Cryptocurrencies
    {
      name: 'BTC/USD',
      symbol: 'BTC/USD',
      type: 'crypto',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.001,
      maxLotSize: 10,
      description: 'Bitcoin vs US Dollar'
    },
    {
      name: 'ETH/USD',
      symbol: 'ETH/USD',
      type: 'crypto',
      lotSizeMultiplier: 1,
      pipCalculation: 'percentage',
      minLotSize: 0.01,
      maxLotSize: 100,
      description: 'Ethereum vs US Dollar'
    }
  ];