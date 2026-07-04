import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/services/admin'

export const runtime = 'nodejs'

async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7), true)
    return decoded.uid
  } catch {
    return null
  }
}

// Delete all docs in a collection ref in batches of 100
async function deleteCollection(
  collRef: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query,
): Promise<void> {
  const snap = await collRef.limit(100).get()
  if (snap.empty) return

  const batch = adminDb.batch()
  snap.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()

  if (snap.size === 100) {
    await deleteCollection(collRef)
  }
}

// Recursively delete a document and all its known subcollections
async function deleteDocWithSubcollections(
  docRef: FirebaseFirestore.DocumentReference,
  subcollections: string[],
): Promise<void> {
  await Promise.all(
    subcollections.map(name => deleteCollection(docRef.collection(name))),
  )
  await docRef.delete()
}

export async function DELETE(request: NextRequest) {
  const uid = await verifyAuth(request)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The shared demo account can never be deleted.
  if (process.env.DEMO_UID && uid === process.env.DEMO_UID) {
    return NextResponse.json(
      { error: 'The demo account cannot be deleted' },
      { status: 403 },
    )
  }

  try {
    // 1. Delete all pulses belonging to this user, including their subcollections
    const pulsesSnap = await adminDb
      .collection('pulses')
      .where('userId', '==', uid)
      .get()

    await Promise.all(
      pulsesSnap.docs.map(doc =>
        deleteDocWithSubcollections(doc.ref, ['trades', 'violationLog']),
      ),
    )

    // 2. Delete the user document and its subcollections
    const userRef = adminDb.collection('users').doc(uid)
    await deleteDocWithSubcollections(userRef, ['journal', 'meta'])

    // 3. Delete the Firebase Auth record
    await adminAuth.deleteUser(uid)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
