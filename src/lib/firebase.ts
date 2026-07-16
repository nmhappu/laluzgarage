import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyDOKnWPCvAAujHhxz6r2HOcvpi_cFsvnIQ",
  authDomain: "gen-lang-client-0601889915.firebaseapp.com",
  projectId: "gen-lang-client-0601889915",
  storageBucket: "gen-lang-client-0601889915.firebasestorage.app",
  messagingSenderId: "70866316727",
  appId: "1:70866316727:web:8da6fe030884ed85b08c32",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e");

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const err = error as { code?: string; message?: string };
  if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
    const user = auth.currentUser;
    const info: FirestoreErrorInfo = {
      error: err.message || 'Missing or insufficient permissions',
      operationType,
      path,
      authInfo: {
        userId: user?.uid || 'anonymous',
        email: user?.email || '',
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous || false,
        providerInfo: user?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(info));
  }
  throw error;
}

/**
 * Validates the connection to Firestore.
 */
async function testConnection() {
  try {
    // Attempt to fetch a dummy document to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection established.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore is unreachable. Please check your configuration or network.');
    } else {
      console.warn('Initial connection check skipped or failed (expected if DB is empty).');
    }
  }
}

testConnection();
