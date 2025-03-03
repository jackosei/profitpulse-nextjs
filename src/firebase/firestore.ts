import { 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { MAX_RISK_PERCENTAGE, type Pulse, type Trade, PULSE_STATUS } from '@/types/pulse';

const checkDuplicatePulseName = async (name: string, userId: string) => {
  const pulsesRef = collection(db, 'pulses');
  const q = query(pulsesRef, 
    where('name', '==', name),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const createPulse = async (pulseData: Omit<Pulse, 'id' | 'createdAt' | 'status'>) => {
  try {
    // Validate inputs
    if (pulseData.maxRiskPerTrade > MAX_RISK_PERCENTAGE) {
      throw new Error(`Maximum risk cannot exceed ${MAX_RISK_PERCENTAGE}%`);
    }

    // Check for duplicate name
    const existingPulse = await checkDuplicatePulseName(pulseData.name, pulseData.userId);
    if (existingPulse) {
      throw new Error('A pulse with this name already exists');
    }

    // Generate unique ID
    const date = new Date();
    const dateStr = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).replace(/\//g, '');
    const pulseId = `${pulseData.name.slice(0, 4).toUpperCase().replace(/\s+/g, '')}${dateStr}`;

    // Create the document with generated ID and timestamp
    const pulseWithId = {
      ...pulseData,
      id: pulseId,
      createdAt: serverTimestamp(),
      status: PULSE_STATUS.ACTIVE,
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        strikeRate: 0,
        totalProfitLoss: 0,
        averageWin: 0,
        averageLoss: 0
      }
    };

    // Add document to Firestore
    const pulsesRef = collection(db, 'pulses');
    await addDoc(pulsesRef, pulseWithId);

    return pulseWithId;
  } catch (error) {
    console.error('Error creating pulse:', error);
    throw error;
  }
};

export const getUserPulses = async (userId: string, status?: typeof PULSE_STATUS[keyof typeof PULSE_STATUS]) => {
  try {
    const pulsesRef = collection(db, 'pulses');
    let q = query(pulsesRef, where('userId', '==', userId));
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      firestoreId: doc.id,
      ...doc.data()
    })) as (Pulse & { firestoreId: string })[];
  } catch (error) {
    console.error('Error fetching pulses:', error);
    throw error;
  }
};

export const getPulseById = async (pulseId: string, userId: string, limitCount = 20) => {
  try {
    // Get pulse data
    const pulsesRef = collection(db, 'pulses');
    const q = query(pulsesRef, 
      where('id', '==', pulseId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Pulse not found');
    }

    const pulseDoc = querySnapshot.docs[0];
    const pulseData = pulseDoc.data();
    
    // Fetch limited trades with ordering
    const tradesRef = collection(db, 'pulses', pulseDoc.id, 'trades');
    const [tradesSnapshot, stats] = await Promise.all([
      getDocs(query(tradesRef, 
        orderBy('date', 'desc'), 
        limit(limitCount)
      )),
      calculatePulseStats(pulseDoc.id)
    ]);

    const trades = tradesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get last document for pagination
    const lastVisible = tradesSnapshot.docs[tradesSnapshot.docs.length - 1];

    return { 
      ...pulseData,
      id: pulseData.id,
      trades,
      stats,
      firestoreId: pulseDoc.id,
      hasMore: tradesSnapshot.docs.length === limitCount,
      lastVisible: lastVisible ? lastVisible.data().date : null
    } as Pulse & { firestoreId: string; hasMore: boolean; lastVisible: string | null };
  } catch (error) {
    console.error('Error fetching pulse:', error);
    throw error;
  }
};

export const getMoreTrades = async (
  firestoreId: string, 
  lastDate: string, 
  limitCount = 20
) => {
  try {
    const tradesRef = collection(db, 'pulses', firestoreId, 'trades');
    const tradesSnapshot = await getDocs(query(tradesRef,
      orderBy('date', 'desc'),
      startAfter(lastDate),
      limit(limitCount)
    ));

    const trades = tradesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      trades,
      hasMore: tradesSnapshot.docs.length === limitCount,
      lastVisible: tradesSnapshot.docs[tradesSnapshot.docs.length - 1]?.data().date
    };
  } catch (error) {
    console.error('Error fetching more trades:', error);
    throw error;
  }
};

export const createTrade = async (pulseId: string, firestoreId: string, tradeData: Omit<Trade, 'id' | 'createdAt'>) => {
  try {
    const pulseRef = doc(db, 'pulses', firestoreId);
    const pulseDoc = await getDoc(pulseRef);
    
    if (!pulseDoc.exists()) {
      throw new Error('Pulse not found');
    }

    const tradeRef = await addDoc(collection(db, 'pulses', firestoreId, 'trades'), {
      ...tradeData,
      createdAt: serverTimestamp(),
    });

    return { id: tradeRef.id, ...tradeData };
  } catch (error) {
    console.error('Error creating trade:', error);
    throw error;
  }
};

export const calculatePulseStats = async (firestoreId: string) => {
  try {
    const tradesRef = collection(db, 'pulses', firestoreId, 'trades');
    const tradesSnapshot = await getDocs(tradesRef);
    
    const stats = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      strikeRate: 0,
      totalProfitLoss: 0,
      averageWin: 0,
      averageLoss: 0
    };

    const winningTrades: number[] = [];
    const losingTrades: number[] = [];

    tradesSnapshot.forEach((doc) => {
      const trade = doc.data() as Trade;
      stats.totalTrades += 1;
      stats.totalProfitLoss += trade.profitLoss;

      if (trade.outcome === 'Win') {
        stats.wins += 1;
        winningTrades.push(trade.profitLoss);
      } else if (trade.outcome === 'Loss') {
        stats.losses += 1;
        losingTrades.push(trade.profitLoss);
      }
    });

    stats.strikeRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
    stats.averageWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, val) => sum + val, 0) / winningTrades.length : 0;
    stats.averageLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, val) => sum + val, 0) / losingTrades.length : 0;

    // Update the pulse with the new stats
    const pulseRef = doc(db, 'pulses', firestoreId);
    await updateDoc(pulseRef, { stats });

    return stats;
  } catch (error) {
    console.error('Error calculating pulse stats:', error);
    throw error;
  }
};

export const deletePulse = async (pulseId: string, userId: string, confirmationName: string) => {
  try {
    // Get pulse data to verify ownership and name
    const pulsesRef = collection(db, 'pulses');
    const q = query(pulsesRef, 
      where('id', '==', pulseId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Pulse not found');
    }

    const pulseDoc = querySnapshot.docs[0];
    const pulseData = pulseDoc.data() as Pulse;

    // Verify confirmation name matches
    if (pulseData.name !== confirmationName) {
      throw new Error('Confirmation name does not match');
    }

    // Delete all trades in the pulse
    const batch = writeBatch(db);
    const tradesRef = collection(db, 'pulses', pulseDoc.id, 'trades');
    const tradesSnapshot = await getDocs(tradesRef);
    
    tradesSnapshot.docs.forEach((tradeDoc) => {
      batch.delete(tradeDoc.ref);
    });

    // Delete the pulse document
    batch.delete(pulseDoc.ref);

    // Commit the batch
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error deleting pulse:', error);
    throw error;
  }
};

export const archivePulse = async (pulseId: string, userId: string) => {
  try {
    const pulsesRef = collection(db, 'pulses');
    const q = query(pulsesRef, 
      where('id', '==', pulseId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Pulse not found');
    }

    const pulseDoc = querySnapshot.docs[0];
    await updateDoc(pulseDoc.ref, { status: PULSE_STATUS.ARCHIVED });

    return { success: true };
  } catch (error) {
    console.error('Error archiving pulse:', error);
    throw error;
  }
};

export const unarchivePulse = async (pulseId: string, userId: string) => {
  try {
    const pulsesRef = collection(db, 'pulses');
    const q = query(pulsesRef, 
      where('id', '==', pulseId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Pulse not found');
    }

    const pulseDoc = querySnapshot.docs[0];
    await updateDoc(pulseDoc.ref, { status: PULSE_STATUS.ACTIVE });

    return { success: true };
  } catch (error) {
    console.error('Error unarchiving pulse:', error);
    throw error;
  }
}; 