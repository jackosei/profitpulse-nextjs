import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK for server-side operations
function initAdmin() {
  if (!admin.apps.length) {
    try {
      // Use environment variables for configuration
      const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };

      // Initialize the admin app
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
      });
      
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
    }
  }
  
  return admin.firestore();
}

// Export the admin Firestore instance
export const adminDb = initAdmin(); 