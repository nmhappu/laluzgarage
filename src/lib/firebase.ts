import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getEnv } from './env';

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'mock-api-key-for-test',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'mock-project.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'mock-project',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'mock-project.appspot.com',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '1234567890',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:1234567890:web:mockappid',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Offline-first like the Compose app: the persistent cache serves the first snapshot instantly
 * (and while offline); writes queue and replay on reconnect. Shared across open tabs.
 */
export const db = initializeFirestore(
  app,
  { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
  getEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID', '(default)')
);
