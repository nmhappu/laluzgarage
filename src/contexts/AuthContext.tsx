import React, { createContext, useContext, useEffect, useState } from 'react';
import '@material/web/progress/circular-progress.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { WorkshopUser } from '../types';

interface AuthContextType {
  user: User | null;
  profile: WorkshopUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MdCircularProgress = 'md-circular-progress' as any;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WorkshopUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (authUser) {
        try {
          const userRef = doc(db, 'users', authUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists() && authUser.email) {
            // Check if there is an existing user profile document in the database with this email
            const q = query(collection(db, 'users'), where('email', '==', authUser.email.toLowerCase()));
            const qSnap = await getDocs(q);
            
            if (!qSnap.empty) {
              // Found pre-existing profile document(s) with matching email
              const oldDoc = qSnap.docs[0];
              const oldData = oldDoc.data();
              
              // Migrate/copy old data to a new document keyed by the actual Auth UID
              await setDoc(userRef, {
                ...oldData,
                id: authUser.uid,
                email: authUser.email, // Ensure email matches
                updatedAt: serverTimestamp()
              });
              
              // If the old document had a different ID, delete the old document
              if (oldDoc.id !== authUser.uid) {
                await deleteDoc(doc(db, 'users', oldDoc.id));
                console.log(`Migrated user profile for ${authUser.email} from temp document ${oldDoc.id} to UID ${authUser.uid}`);
              }
            } else {
              // No existing profile found, create a new one
              await setDoc(userRef, {
                id: authUser.uid,
                name: authUser.displayName || authUser.email.split('@')[0] || 'Unnamed Advisor',
                email: authUser.email,
                status: 'offline',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              console.log(`Created new profile document for ${authUser.email} with UID ${authUser.uid}`);
            }
          }
        } catch (e) {
          console.error('Error auto-syncing user profile:', e);
        }

        // Setup real-time listener for the active user profile
        unsubscribeProfile = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as WorkshopUser);
          } else {
            setProfile(null);
          }
        }, (err) => {
          console.error('Real-time profile listener error:', err);
        });
      } else {
        setProfile(null);
      }

      setUser(authUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      
      // Add to users collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: displayName,
        email: email,
        status: 'offline',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Force user state refresh to include displayName
      setUser({ ...userCredential.user, displayName });
    }
  };

  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workshop-bg">
        <div className="text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-workshop-accent/15 blur-2xl rounded-full scale-110" />
            <MdCircularProgress
              indeterminate
              style={{
                '--md-circular-progress-size': '48px',
                '--md-circular-progress-active-indicator-color': 'var(--color-workshop-accent)'
              }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-workshop-text font-logo font-semibold text-xs tracking-tight animate-pulse">Laluz Garage</p>
            <p className="text-workshop-muted font-bold text-[10px] uppercase tracking-[0.2em] opacity-40">Waking up workshop systems...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
