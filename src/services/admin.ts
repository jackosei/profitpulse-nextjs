import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK for server-side operations
function initAdmin() {
  if (!admin.apps.length) {
    try {
      const appEnv = process.env.APP_ENV || 'development';
      const isProduction = appEnv === 'production';

      const projectId = isProduction
        ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_STAGING;
      const clientEmail = isProduction
        ? process.env.FIREBASE_CLIENT_EMAIL
        : process.env.FIREBASE_CLIENT_EMAIL_STAGING;
      const privateKey = isProduction
        ? process.env.FIREBASE_PRIVATE_KEY
        : process.env.FIREBASE_PRIVATE_KEY_STAGING;

      if (!privateKey || !clientEmail || !projectId) {
        throw new Error('Missing Firebase Admin SDK configuration environment variables');
      }

      // Use environment variables for configuration
      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        type: 'service_account'
      };

      // Initialize the admin app
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
      });

      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      throw error; // Re-throw the error to handle it in the API route
    }
  }
}

initAdmin();

// Export the admin Firestore and Auth instances
export const adminDb = admin.firestore();
export const adminAuth = admin.auth(); 