export interface Quote {
  text: string;
  author: string;
  category: string;
}

export const tradingQuotes: Quote[] = [
  {
    text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
    author: "Philip Fisher",
    category: "trading"
  },
  {
    text: "The most important quality for an investor is temperament, not intellect.",
    author: "Warren Buffett",
    category: "trading"
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
    category: "trading"
  },
  {
    text: "Markets are never wrong – opinions often are.",
    author: "Jesse Livermore",
    category: "trading"
  },
  {
    text: "The goal of a successful trader is to make the best trades. Money is secondary.",
    author: "Alexander Elder",
    category: "trading"
  },
  {
    text: "Don't focus on making money; focus on protecting what you have.",
    author: "Paul Tudor Jones",
    category: "trading"
  },
  {
    text: "Trading doesn't just reveal your character, it also builds it if you stay in the game long enough.",
    author: "Yvan Byeajee",
    category: "trading"
  },
  {
    text: "The key to trading success is emotional discipline. If intelligence were the key, there would be a lot more people making money trading.",
    author: "Victor Sperandeo",
    category: "trading"
  },
  {
    text: "Successful trading is about finding the rules that work and then sticking to those rules.",
    author: "William O'Neil",
    category: "trading"
  },
  {
    text: "The elements of good trading are: (1) cutting losses, (2) cutting losses, and (3) cutting losses.",
    author: "Ed Seykota",
    category: "trading"
  }
  // ... We can add more quotes later if needed
]; 