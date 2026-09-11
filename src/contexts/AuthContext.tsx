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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { WorkshopUser } from '../types';

interface AuthContextType {
  user: User | null;
  profile: WorkshopUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WorkshopUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Deliberate minimum hold to prevent sub-second flicker on fast cache/network
    const timer = setTimeout(() => {
      setMinHoldDone(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Process redirect result if browser used redirect-based sign-in
    if (!Capacitor.isNativePlatform()) {
      getRedirectResult(auth).catch((redirectErr) => {
        console.debug('Google redirect result check:', redirectErr);
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }

      if (authUser) {
        try {
          const userRef = doc(db, 'users', authUser.uid);
          let userSnap = await getDoc(userRef);
          const emailLower = authUser.email ? authUser.email.toLowerCase() : '';

          if (!userSnap.exists() && emailLower) {
            // Check if there is a pre-registered profile doc with this email (e.g., added by manager)
            const q = query(collection(db, 'users'), where('email', '==', emailLower));
            const qSnap = await getDocs(q);
            
            if (!qSnap.empty) {
              const oldDoc = qSnap.docs[0];
              const oldData = oldDoc.data();
              
              await setDoc(userRef, {
                ...oldData,
                id: authUser.uid,
                name: oldData.name || authUser.displayName || emailLower.split('@')[0] || 'Team Member',
                email: emailLower,
                status: oldData.status || 'offline',
                createdAt: oldData.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              
              if (oldDoc.id !== authUser.uid) {
                await deleteDoc(doc(db, 'users', oldDoc.id));
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

          // Check if any admin exists across the entire workshop
          const allUsersSnap = await getDocs(collection(db, 'users'));
          const hasAdmin = allUsersSnap.docs.some(d => {
            const data = d.data();
            return data.role === 'admin' || (Array.isArray(data.tags) && data.tags.includes('admin'));
          });

          // Zero-Admin Bootstrap: If NO admin exists in the entire database, promote this user
          if (!hasAdmin && userSnap.exists()) {
            console.log(`Zero-Admin condition detected. Bootstrapping ${emailLower} as initial workshop Admin.`);
            try {
              // Create admin lock setting document
              await setDoc(doc(db, 'settings', 'admin_lock'), {
                adminUid: authUser.uid,
                adminEmail: emailLower,
                bootstrappedAt: serverTimestamp()
              }, { merge: true });

              // Promote active user to admin
              await updateDoc(userRef, {
                role: 'admin',
                tags: arrayUnion('admin'),
                updatedAt: serverTimestamp()
              });
            } catch (bootstrapErr) {
              console.warn('Bootstrap admin lock notice:', bootstrapErr);
            }
          }
        } catch (e) {
          console.error('Error auto-syncing user profile:', e);
          try {
            handleFirestoreError(e, 'write', `users/${authUser.uid}`);
          } catch {
            // Captured
          }
        }

        // Setup real-time listener for active user profile
        unsubscribeProfileRef.current = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as WorkshopUser);
          } else {
            setProfile(null);
          }
        }, (err) => {
          console.error('Real-time profile listener error:', err);
          try {
            handleFirestoreError(err, 'get', `users/${authUser.uid}`);
          } catch {
            // Captured
          }
        });
      } else {
        setProfile(null);
      }

      setUser(authUser);
      setAuthResolved(true);
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      // Native Android Google Sign-In via system account picker
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In was cancelled or failed to return credentials.');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } else {
      // Web browser flow: attempt popup first, fallback to redirect if popup is blocked
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await signInWithPopup(auth, provider);
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
  }, []);

  const logout = useCallback(async () => {
    // 1. Unsubscribe profile snapshot listener first
    if (unsubscribeProfileRef.current) {
      try {
        unsubscribeProfileRef.current();
      } catch (err) {
        console.warn('Error unsubscribing profile listener on logout:', err);
      }
      unsubscribeProfileRef.current = null;
    }

    // 2. Best-effort mark user offline in Firestore
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      try {
        const userRef = doc(db, 'users', currentUid);
        await updateDoc(userRef, {
          status: 'offline',
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Could not update status to offline in Firestore:', err);
      }
    }

    // 3. Sign out of Firebase Auth and native Capacitor session
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signOut().catch((nativeErr) => {
          console.debug('Native signOut notice:', nativeErr);
        });
      }
      await signOut(auth);
    } catch (err) {
      console.error('Firebase signOut error:', err);
    } finally {
      setUser(null);
      setProfile(null);
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
