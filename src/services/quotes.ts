import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreConfig";
import { tradingQuotes } from "@/data/tradingQuotes";

export interface Quote {
  text: string;
  author: string;
  category: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

// Function to seed quotes if they don't exist
export const seedQuotes = async () => {
  try {
    const quotesRef = collection(db, "quotes");
    const snapshot = await getDocs(quotesRef);

    if (snapshot.empty) {
      const batch = tradingQuotes.map((quote) =>
        addDoc(quotesRef, {
          ...quote,
          category: "trading",
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(batch);
      console.log("Quotes seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding quotes:", error);
  }
};

// Function to get a random quote for the day
export const getDailyQuote = async () => {
  try {
    const quotesRef = collection(db, "quotes");
    const snapshot = await getDocs(quotesRef);
    
    if (snapshot.empty) {
      await seedQuotes();
      return tradingQuotes[0];
    }

    const quotes = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Quote & { id: string }));

    // Use the date to get a consistent quote for the day
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 
      1000 / 60 / 60 / 24
    );
    
    return quotes[dayOfYear % quotes.length];
  } catch (error) {
    console.error("Error getting daily quote:", error);
    // Fallback to local quotes if there's an error
    return tradingQuotes[0];
  }
}; 