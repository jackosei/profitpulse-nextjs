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
	writeBatch,
	arrayUnion,
} from "firebase/firestore"
import { db } from "./firestoreConfig"
import {
	MAX_RISK_PERCENTAGE,
	MAX_DAILY_DRAWDOWN,
	MAX_TOTAL_DRAWDOWN,
	type Pulse,
	type Trade,
	PULSE_STATUS,
} from "@/types/pulse"

const checkDuplicatePulseName = async (name: string, userId: string) => {
	const pulsesRef = collection(db, "pulses")
	const q = query(
		pulsesRef,
		where("name", "==", name),
		where("userId", "==", userId)
	)
	const querySnapshot = await getDocs(q)
	return !querySnapshot.empty
}

export const createPulse = async (
	pulseData: Omit<Pulse, "id" | "createdAt" | "status">
) => {
	try {
		// Validate inputs
		if (pulseData.maxRiskPerTrade > MAX_RISK_PERCENTAGE) {
			throw new Error(`Maximum risk cannot exceed ${MAX_RISK_PERCENTAGE}%`)
		}

		// Check for duplicate name
		const existingPulse = await checkDuplicatePulseName(
			pulseData.name,
			pulseData.userId
		)
		if (existingPulse) {
			throw new Error("A pulse with this name already exists")
		}

		// Generate unique ID
		const date = new Date()
		const dateStr = date
			.toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "2-digit",
			})
			.replace(/\//g, "")
		const pulseId = `${pulseData.name
			.slice(0, 4)
			.toUpperCase()
			.replace(/\s+/g, "")}${dateStr}`

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
				averageLoss: 0,
				profitFactor: 0,
			},
		}

		// Add document to Firestore
		const pulsesRef = collection(db, "pulses")
		await addDoc(pulsesRef, pulseWithId)

		return pulseWithId
	} catch (error) {
		console.error("Error creating pulse:", error)
		throw error
	}
}

export const getUserPulses = async (
	userId: string,
	status?: (typeof PULSE_STATUS)[keyof typeof PULSE_STATUS]
) => {
	try {
		const pulsesRef = collection(db, "pulses")
		let q = query(pulsesRef, where("userId", "==", userId))

		if (status) {
			q = query(q, where("status", "==", status))
		}

		const querySnapshot = await getDocs(q)

		return querySnapshot.docs.map((doc) => ({
			firestoreId: doc.id,
			...doc.data(),
		})) as (Pulse & { firestoreId: string })[]
	} catch (error) {
		console.error("Error fetching pulses:", error)
		throw error
	}
}

export const getPulseById = async (
	pulseId: string,
	userId: string,
	limitCount = 20
) => {
	try {
		// Get pulse data
		const pulsesRef = collection(db, "pulses")
		const q = query(
			pulsesRef,
			where("id", "==", pulseId),
			where("userId", "==", userId)
		)
		const querySnapshot = await getDocs(q)

		if (querySnapshot.empty) {
			throw new Error("Pulse not found")
		}

		const pulseDoc = querySnapshot.docs[0]
		const pulseData = pulseDoc.data()

		// Fetch limited trades with ordering
		const tradesRef = collection(db, "pulses", pulseDoc.id, "trades")
		const [tradesSnapshot, stats] = await Promise.all([
			getDocs(query(tradesRef, orderBy("date", "desc"), limit(limitCount))),
			calculatePulseStats(pulseDoc.id),
		])

		const trades = tradesSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}))

		// Get last document for pagination
		const lastVisible = tradesSnapshot.docs[tradesSnapshot.docs.length - 1]

		return {
			...pulseData,
			id: pulseData.id,
			trades,
			stats,
			firestoreId: pulseDoc.id,
			hasMore: tradesSnapshot.docs.length === limitCount,
			lastVisible: lastVisible ? lastVisible.data().date : null,
		} as Pulse & {
			firestoreId: string
			hasMore: boolean
			lastVisible: string | null
		}
	} catch (error) {
		console.error("Error fetching pulse:", error)
		throw error
	}
}

export const getMoreTrades = async (
	firestoreId: string,
	lastDate: string,
	limitCount = 20
) => {
	try {
		const tradesRef = collection(db, "pulses", firestoreId, "trades")
		const tradesSnapshot = await getDocs(
			query(
				tradesRef,
				orderBy("date", "desc"),
				startAfter(lastDate),
				limit(limitCount)
			)
		)

		const trades = tradesSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}))

		return {
			trades,
			hasMore: tradesSnapshot.docs.length === limitCount,
			lastVisible:
				tradesSnapshot.docs[tradesSnapshot.docs.length - 1]?.data().date,
		}
	} catch (error) {
		console.error("Error fetching more trades:", error)
		throw error
	}
}

export const createTrade = async (
	pulseId: string,
	firestoreId: string,
	tradeData: Omit<Trade, "id" | "createdAt">
) => {
	try {
		// Get the pulse document first to check rules
		const pulseRef = doc(db, "pulses", firestoreId)
		const pulseSnap = await getDoc(pulseRef)
		
		if (!pulseSnap.exists()) {
			throw new Error("Pulse not found")
		}
		
		const pulseData = pulseSnap.data() as Pulse

		// Check if pulse is locked
		if (pulseData.status === PULSE_STATUS.LOCKED) {
			throw new Error("This pulse is locked due to risk limit violations. Please review your risk management rules.")
		}
		
		// Check if this is a losing trade
		if (tradeData.outcome === "Loss") {
			const lossAmount = Math.abs(tradeData.profitLoss)
			const lossPercentage = (lossAmount / pulseData.accountSize) * 100
			
			// Get the date key for this trade
			const tradeDate = tradeData.date.split('T')[0]
			
			// Initialize or get current daily loss tracking
			const dailyLoss = pulseData.dailyLoss || {}
			const currentDailyLoss = dailyLoss[tradeDate] || 0
			
			// Calculate new daily loss with this trade
			const newDailyLoss = currentDailyLoss + lossAmount
			const newDailyLossPercentage = (newDailyLoss / pulseData.accountSize) * 100
			
			// Check against max daily drawdown
			if (newDailyLossPercentage > pulseData.maxDailyDrawdown) {
				// Lock the pulse and record violation
				await updateDoc(pulseRef, {
					status: PULSE_STATUS.LOCKED,
					ruleViolations: arrayUnion(`Daily drawdown limit exceeded on ${tradeDate}: ${newDailyLossPercentage.toFixed(2)}% vs ${pulseData.maxDailyDrawdown}%`)
				});
				throw new Error(`This trade would exceed your maximum daily drawdown limit of ${pulseData.maxDailyDrawdown}%. The pulse has been locked.`)
			}
			
			// Calculate total drawdown
			const currentTotalDrawdown = pulseData.totalDrawdown || 0
			const newTotalDrawdown = currentTotalDrawdown + lossAmount
			const newTotalDrawdownPercentage = (newTotalDrawdown / pulseData.accountSize) * 100
			
			// Check against max total drawdown
			if (newTotalDrawdownPercentage > pulseData.maxTotalDrawdown) {
				// Lock the pulse and record violation
				await updateDoc(pulseRef, {
					status: PULSE_STATUS.LOCKED,
					ruleViolations: arrayUnion(`Total drawdown limit exceeded: ${newTotalDrawdownPercentage.toFixed(2)}% vs ${pulseData.maxTotalDrawdown}%`)
				});
				throw new Error(`This trade would exceed your maximum total drawdown limit of ${pulseData.maxTotalDrawdown}%. The pulse has been locked.`)
			}
			
			// Update daily loss tracking
			dailyLoss[tradeDate] = newDailyLoss
			
			// Update the pulse with new loss tracking
			await updateDoc(pulseRef, {
				dailyLoss: dailyLoss,
				totalDrawdown: newTotalDrawdown
			})
		}
		
		// Create the trade
		const tradesRef = collection(db, "pulses", firestoreId, "trades")
		const newTradeRef = await addDoc(tradesRef, {
			...tradeData,
			createdAt: serverTimestamp(),
		})
		
		// Update pulse stats
		await calculatePulseStats(firestoreId)
		
		return { id: newTradeRef.id }
	} catch (error) {
		console.error("Error creating trade:", error)
		throw error
	}
}

export const calculatePulseStats = async (firestoreId: string) => {
	try {
		const tradesRef = collection(db, "pulses", firestoreId, "trades")
		const pulseRef = doc(db, "pulses", firestoreId)
		
		// Get pulse data for rule checking
		const pulseDoc = await getDoc(pulseRef)
		if (!pulseDoc.exists()) {
			throw new Error("Pulse not found")
		}
		const pulseData = pulseDoc.data() as Pulse

		const tradesSnapshot = await getDocs(tradesRef)

		const stats = {
			totalTrades: 0,
			wins: 0,
			losses: 0,
			strikeRate: 0,
			totalProfitLoss: 0,
			averageWin: 0,
			averageLoss: 0,
			profitFactor: 0,
		}

		const winningTrades: number[] = []
		const losingTrades: number[] = []
		let totalGrossProfit = 0
		let totalGrossLoss = 0

		// Group trades by date for daily stats
		const dailyStats: { [key: string]: { loss: number; risk: number } } = {}
		const weeklyStats: { [key: string]: { loss: number } } = {}

		tradesSnapshot.forEach((doc) => {
			const trade = doc.data() as Trade
			const tradeDate = new Date(trade.date)
			const dateKey = tradeDate.toISOString().split('T')[0]
			const weekKey = getWeekKey(tradeDate)

			// Initialize daily stats
			if (!dailyStats[dateKey]) {
				dailyStats[dateKey] = { loss: 0, risk: 0 }
			}
			if (!weeklyStats[weekKey]) {
				weeklyStats[weekKey] = { loss: 0 }
			}

			// Update daily and weekly stats
			if (trade.outcome === "Loss") {
				dailyStats[dateKey].loss += Math.abs(trade.profitLoss)
				weeklyStats[weekKey].loss += Math.abs(trade.profitLoss)
			}
			dailyStats[dateKey].risk += (trade.lotSize * pulseData.maxRiskPerTrade) / 100

			stats.totalTrades += 1
			stats.totalProfitLoss += trade.profitLoss

			if (trade.outcome === "Win") {
				stats.wins += 1
				winningTrades.push(trade.profitLoss)
				totalGrossProfit += trade.profitLoss
			} else if (trade.outcome === "Loss") {
				stats.losses += 1
				losingTrades.push(trade.profitLoss)
				totalGrossLoss += Math.abs(trade.profitLoss)
			}
		})

		// Check for rule violations
		const ruleViolations: string[] = []

		// Check daily risk limit
		Object.entries(dailyStats).forEach(([date, stats]) => {
			if (stats.risk > pulseData.maxDailyDrawdown) {
				ruleViolations.push(`Daily risk limit exceeded on ${date}: ${stats.risk.toFixed(2)}% vs ${pulseData.maxDailyDrawdown}%`)
			}
		})

		stats.strikeRate =
			stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0
		stats.averageWin =
			winningTrades.length > 0
				? winningTrades.reduce((sum, val) => sum + val, 0) /
				  winningTrades.length
				: 0
		stats.averageLoss =
			losingTrades.length > 0
				? losingTrades.reduce((sum, val) => sum + val, 0) / losingTrades.length
				: 0

		// Calculate profit factor (totalGrossProfit / totalGrossLoss)
		stats.profitFactor =
			totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : 0

		// Update the pulse with the new stats and lock status if rules are violated
		await updateDoc(pulseRef, { 
			stats,
			status: ruleViolations.length > 0 ? 'locked' : PULSE_STATUS.ACTIVE,
			ruleViolations: ruleViolations.length > 0 ? ruleViolations : null
		})

		return stats
	} catch (error) {
		console.error("Error calculating pulse stats:", error)
		throw error
	}
}

// Helper function to get week key
function getWeekKey(date: Date): string {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay()) // Set to previous Sunday
    return d.toISOString().split('T')[0]
}

export const deletePulse = async (
	pulseId: string,
	userId: string,
	confirmationName: string
) => {
	try {
		// Get pulse data to verify ownership and name
		const pulsesRef = collection(db, "pulses")
		const q = query(
			pulsesRef,
			where("id", "==", pulseId),
			where("userId", "==", userId)
		)
		const querySnapshot = await getDocs(q)

		if (querySnapshot.empty) {
			throw new Error("Pulse not found")
		}

		const pulseDoc = querySnapshot.docs[0]
		const pulseData = pulseDoc.data() as Pulse

		// Verify confirmation name matches
		if (pulseData.name !== confirmationName) {
			throw new Error("Confirmation name does not match")
		}

		// Delete all trades in the pulse
		const batch = writeBatch(db)
		const tradesRef = collection(db, "pulses", pulseDoc.id, "trades")
		const tradesSnapshot = await getDocs(tradesRef)

		tradesSnapshot.docs.forEach((tradeDoc) => {
			batch.delete(tradeDoc.ref)
		})

		// Delete the pulse document
		batch.delete(pulseDoc.ref)

		// Commit the batch
		await batch.commit()

		return { success: true }
	} catch (error) {
		console.error("Error deleting pulse:", error)
		throw error
	}
}

export const archivePulse = async (pulseId: string, userId: string) => {
	try {
		const pulsesRef = collection(db, "pulses")
		const q = query(
			pulsesRef,
			where("id", "==", pulseId),
			where("userId", "==", userId)
		)
		const querySnapshot = await getDocs(q)

		if (querySnapshot.empty) {
			throw new Error("Pulse not found")
		}

		const pulseDoc = querySnapshot.docs[0]
		await updateDoc(pulseDoc.ref, { status: PULSE_STATUS.ARCHIVED })

		return { success: true }
	} catch (error) {
		console.error("Error archiving pulse:", error)
		throw error
	}
}

export const unarchivePulse = async (pulseId: string, userId: string) => {
	try {
		const pulsesRef = collection(db, "pulses")
		const q = query(
			pulsesRef,
			where("id", "==", pulseId),
			where("userId", "==", userId)
		)
		const querySnapshot = await getDocs(q)

		if (querySnapshot.empty) {
			throw new Error("Pulse not found")
		}

		const pulseDoc = querySnapshot.docs[0]
		await updateDoc(pulseDoc.ref, { status: PULSE_STATUS.ACTIVE })

		return { success: true }
	} catch (error) {
		console.error("Error unarchiving pulse:", error)
		throw error
	}
}

export const updatePulse = async (
	pulseId: string,
	userId: string,
	updateData: {
		accountSize: number;
		maxRiskPerTrade: number;
		maxDailyDrawdown: number;
		maxTotalDrawdown: number;
		instruments: string[];
		updateReason: string;
	}
) => {
	try {
		// Get pulse data to verify ownership
		const pulsesRef = collection(db, "pulses")
		const q = query(
			pulsesRef,
			where("id", "==", pulseId),
			where("userId", "==", userId)
		)
		const querySnapshot = await getDocs(q)

		if (querySnapshot.empty) {
			throw new Error("Pulse not found")
		}

		const pulseDoc = querySnapshot.docs[0]
		const pulseData = pulseDoc.data() as Pulse

		// Check if pulse has already been updated
		if (pulseData.hasBeenUpdated) {
			throw new Error("This pulse has already been updated once")
		}

		// Store previous values and update pulse
		const previousValues = {
			accountSize: pulseData.accountSize || 0,
			maxRiskPerTrade: pulseData.maxRiskPerTrade || 0,
			maxDailyDrawdown: pulseData.maxDailyDrawdown || 0,
			maxTotalDrawdown: pulseData.maxTotalDrawdown || 0,
			instruments: pulseData.instruments || []
		}

		// Validate update data
		if (updateData.maxRiskPerTrade > MAX_RISK_PERCENTAGE) {
			throw new Error(`Maximum risk cannot exceed ${MAX_RISK_PERCENTAGE}%`)
		}

		if (updateData.maxDailyDrawdown > MAX_DAILY_DRAWDOWN) {
			throw new Error(`Maximum daily drawdown cannot exceed ${MAX_DAILY_DRAWDOWN}%`)
		}

		if (updateData.maxTotalDrawdown > MAX_TOTAL_DRAWDOWN) {
			throw new Error(`Maximum total drawdown cannot exceed ${MAX_TOTAL_DRAWDOWN}%`)
		}

		await updateDoc(pulseDoc.ref, {
			accountSize: updateData.accountSize,
			maxRiskPerTrade: updateData.maxRiskPerTrade,
			maxDailyDrawdown: updateData.maxDailyDrawdown,
			maxTotalDrawdown: updateData.maxTotalDrawdown,
			instruments: updateData.instruments,
			hasBeenUpdated: true,
			lastUpdate: {
				date: serverTimestamp(),
				reason: updateData.updateReason,
				previousValues
			}
		})

		return { success: true }
	} catch (error) {
		console.error("Error updating pulse:", error)
		throw error
	}
}
