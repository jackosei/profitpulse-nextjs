import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const appEnv = process.env.APP_ENV || "development"
const isProduction = appEnv === "production"

const firebaseConfig = {
	apiKey: isProduction
		? process.env.NEXT_PUBLIC_FIREBASE_API_KEY
		: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_STAGING,
	authDomain: isProduction
		? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
		: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_STAGING,
	projectId: isProduction
		? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
		: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_STAGING,
	storageBucket: isProduction
		? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
		: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_STAGING,
	messagingSenderId: isProduction
		? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
		: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_STAGING,
	appId: isProduction
		? process.env.NEXT_PUBLIC_FIREBASE_APP_ID
		: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_STAGING,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export { app }
export default app
