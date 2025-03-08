import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { DEFAULT_USER_ROLE } from '@/types/user';

// Rate limiting
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const attempts = new Map<string, { count: number; timestamp: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const userAttempts = attempts.get(ip);

  // Clean up old entries
  if (userAttempts && now - userAttempts.timestamp > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }

  if (!userAttempts) {
    attempts.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (userAttempts.count >= MAX_ATTEMPTS) {
    return true;
  }

  userAttempts.count++;
  return false;
}

export async function POST(request: Request) {
  try {
    // Get client IP (in production, you'd get this from headers)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    if (isRateLimited(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { uid, secretKey } = await request.json();

    if (!uid || !secretKey) {
      console.error('Missing required fields:', { uid: !!uid, secretKey: !!secretKey });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if environment variable is set
    if (!process.env.ADMIN_SETUP_KEY) {
      console.error('ADMIN_SETUP_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify secret key
    if (secretKey !== process.env.ADMIN_SETUP_KEY) {
      console.error('Invalid secret key provided');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid secret key' },
        { status: 401 }
      );
    }

    // Check for existing admins
    const usersRef = adminDb.collection('users');
    const adminSnapshot = await usersRef.where('role', '==', 'admin').limit(1).get();
    
    if (!adminSnapshot.empty) {
      console.error('Admin user already exists');
      return NextResponse.json(
        { error: 'An admin user already exists' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userRef = usersRef.doc(uid);
    const userDoc = await userRef.get();
    
    // If user doesn't exist, create a basic profile
    if (!userDoc.exists) {
      const now = admin.firestore.Timestamp.now();
      // Create a basic user profile
      await userRef.set({
        uid,
        email: `user-${uid.substring(0, 6)}@profitpulse.com`, // Placeholder
        displayName: "Admin User",
        role: 'admin',
        createdAt: now,
        updatedAt: now
      });
    } else {
      // Update existing user to admin role
      await userRef.update({
        role: 'admin',
        updatedAt: admin.firestore.Timestamp.now()
      });
    }

    console.log(`Successfully set up admin user with UID: ${uid}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in admin setup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set up admin', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}