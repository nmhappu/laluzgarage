import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import '@material/web/progress/circular-progress.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, onSnapshot, arrayUnion, limit } from 'firebase/firestore';
import { WorkshopUser, getUserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: WorkshopUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Synchronizes the user document in Firestore and handles zero-admin bootstrap
 * without performing expensive full-collection queries.
 */
async function syncUserProfile(authUser: User): Promise<WorkshopUser | null> {
  const userRef = doc(db, 'users', authUser.uid);
  let userSnap = await getDoc(userRef);
  const emailLower = authUser.email ? authUser.email.toLowerCase() : '';

  if (!userSnap.exists() && emailLower) {
    // Check if there is a pre-registered profile doc with this email (e.g., added by manager)
    const q = query(collection(db, 'users'), where('email', '==', emailLower), limit(1));
    const qSnap = await getDocs(q);

    if (!qSnap.empty) {
      const oldDoc = qSnap.docs[0];
      const oldData = oldDoc.data();

      const migratedProfile: WorkshopUser = {
        ...oldData,
        id: authUser.uid,
        name: oldData.name || authUser.displayName || emailLower.split('@')[0] || 'Team Member',
        email: emailLower,
        status: oldData.status || 'offline',
        createdAt: oldData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      } as WorkshopUser;

      await setDoc(userRef, migratedProfile);

      if (oldDoc.id !== authUser.uid) {
        await deleteDoc(doc(db, 'users', oldDoc.id)).catch((delErr) => {
          console.warn('Could not delete old pre-registered user doc:', delErr);
        });
      }
    } else {
      // New user registration - create initial base profile
      await setDoc(userRef, {
        id: authUser.uid,
        name: authUser.displayName || emailLower.split('@')[0] || 'Team Member',
        email: emailLower,
        status: 'offline',
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    userSnap = await getDoc(userRef);
  }

  if (!userSnap.exists()) {
    return null;
  }

  let profileData = userSnap.data() as WorkshopUser;

  // Zero-Admin Bootstrap:
  // Check ONLY if this user does not already have an assigned role
  const activeRole = getUserRole(profileData);
  if (!activeRole) {
    try {
      // Targeted check: query if any admin exists in users using a limit(1) query
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
      const adminSnap = await getDocs(adminQuery);
      let hasAdmin = !adminSnap.empty;

      if (!hasAdmin) {
        // Fallback check: legacy tags array contains 'admin'
        const tagAdminQuery = query(collection(db, 'users'), where('tags', 'array-contains', 'admin'), limit(1));
        const tagAdminSnap = await getDocs(tagAdminQuery);
        hasAdmin = !tagAdminSnap.empty;
      }

      if (!hasAdmin) {
        console.log(`Zero-Admin condition detected. Bootstrapping ${emailLower} as initial workshop Admin.`);
        // Create admin lock setting document
        await setDoc(doc(db, 'settings', 'admin_lock'), {
          adminUid: authUser.uid,
          adminEmail: emailLower,
          bootstrappedAt: serverTimestamp()
        }, { merge: true }).catch((lockErr) => {
          console.warn('Bootstrap admin lock notice:', lockErr);
        });

        // Promote active user to admin
        await updateDoc(userRef, {
          role: 'admin',
          tags: arrayUnion('admin'),
          updatedAt: serverTimestamp()
        });

        profileData = {
          ...profileData,
          role: 'admin',
          tags: Array.isArray(profileData.tags) ? [...profileData.tags, 'admin'] : ['admin']
        };
      }
    } catch (bootstrapErr) {
      console.warn('Zero-admin check notice:', bootstrapErr);
    }
  }

  return profileData;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WorkshopUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);
  const activeUidRef = useRef<string | null>(null);
  const profileRef = useRef<WorkshopUser | null>(null);

  useEffect(() => {
    // Brief minimum hold to prevent 1-frame micro-flicker on fast cache
    const timer = setTimeout(() => {
      setMinHoldDone(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const attachUserSession = useCallback(async (authUser: User) => {
    if (activeUidRef.current === authUser.uid && profileRef.current) {
      return;
    }
    activeUidRef.current = authUser.uid;

    if (unsubscribeProfileRef.current) {
      unsubscribeProfileRef.current();
      unsubscribeProfileRef.current = null;
    }

    try {
      const profileData = await syncUserProfile(authUser);
      if (profileData) {
        profileRef.current = profileData;
        setProfile(profileData);
      }
      setUser(authUser);
    } catch (e) {
      console.error('Error auto-syncing user profile:', e);
      try {
        handleFirestoreError(e, 'get', `users/${authUser.uid}`);
      } catch {
        // Captured
      }
      setUser(authUser);
    } finally {
      setAuthResolved(true);
    }

    // Setup real-time listener for active user profile
    unsubscribeProfileRef.current = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as WorkshopUser;
        profileRef.current = data;
        setProfile(data);
      } else {
        profileRef.current = null;
        setProfile(null);
      }
    }, (err) => {
      console.error('Real-time profile listener error:', err);
    });
  }, []);

  useEffect(() => {
    // Process redirect result if browser used redirect-based sign-in
    if (!Capacitor.isNativePlatform()) {
      getRedirectResult(auth).catch((redirectErr) => {
        console.debug('Google redirect result check:', redirectErr);
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        await attachUserSession(authUser);
      } else {
        activeUidRef.current = null;
        profileRef.current = null;
        if (unsubscribeProfileRef.current) {
          unsubscribeProfileRef.current();
          unsubscribeProfileRef.current = null;
        }
        setUser(null);
        setProfile(null);
        setAuthResolved(true);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
    };
  }, [attachUserSession]);

  const login = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      await attachUserSession(credential.user);
    }
  }, [attachUserSession]);

  const loginWithGoogle = useCallback(async () => {
    let loggedInUser: User | null = null;
    if (Capacitor.isNativePlatform()) {
      // Native Android Google Sign-In via system account picker
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In was cancelled or failed to return credentials.');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      loggedInUser = userCredential.user;
    } else {
      // Web browser flow: attempt popup first, fallback to redirect if popup is blocked
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const userCredential = await signInWithPopup(auth, provider);
        loggedInUser = userCredential.user;
      } catch (popupErr: unknown) {
        const errorObj = popupErr as { code?: string };
        if (
          errorObj?.code === 'auth/popup-blocked' ||
          errorObj?.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          console.info('Popup blocked/unsupported; falling back to signInWithRedirect:', errorObj.code);
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    }

    if (loggedInUser) {
      await attachUserSession(loggedInUser);
    }
  }, [attachUserSession]);

  const logout = useCallback(async () => {
    activeUidRef.current = null;
    profileRef.current = null;

    // 1. Unsubscribe profile snapshot listener first
    if (unsubscribeProfileRef.current) {
      try {
        unsubscribeProfileRef.current();
      } catch (err) {
        console.warn('Error unsubscribing profile listener on logout:', err);
      }
      unsubscribeProfileRef.current = null;
    }

    // 2. Best-effort mark user offline in Firestore (non-blocking)
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      updateDoc(doc(db, 'users', currentUid), {
        status: 'offline',
        updatedAt: serverTimestamp()
      }).catch((err) => {
        console.warn('Could not update status to offline in Firestore:', err);
      });
    }

    // 3. Clear local auth state immediately for instant UI response
    setUser(null);
    setProfile(null);

    // 4. Sign out of Firebase Auth and native Capacitor session
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signOut().catch((nativeErr) => {
          console.debug('Native signOut notice:', nativeErr);
        });
      }
      await signOut(auth);
    } catch (err) {
      console.error('Firebase signOut error:', err);
    }
  }, []);

  const loading = !authResolved || !minHoldDone;

  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    login,
    loginWithGoogle,
    logout
  }), [user, profile, loading, login, loginWithGoogle, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
