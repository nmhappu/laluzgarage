import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getUserRole, userFromDoc, type WorkshopUser } from '../types';

/**
 * Sign-in and the signed-in member's profile, following AuthRepository.kt: pre-registered profiles
 * (added by an admin under the same email) are migrated to the account's uid, and the very first
 * account on an empty workshop becomes its admin.
 */

export type AuthScreen = 'loading' | 'unauthenticated' | 'pending' | 'choose-theme' | 'authenticated';

interface AuthContextValue {
  user: User | null;
  profile: WorkshopUser | null;
  screen: AuthScreen;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  finishThemeChoice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const THEME_CHOSEN_KEY = 'theme_chosen_by';

function readThemeChosenBy(): Set<string> {
  try {
    const raw = localStorage.getItem(THEME_CHOSEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeThemeChosenBy(set: Set<string>) {
  try {
    localStorage.setItem(THEME_CHOSEN_KEY, JSON.stringify([...set]));
  } catch {
    // Storage blocked: the picker shows again next time, which is harmless.
  }
}

async function markOnline(ref: DocumentReference, currentStatus: unknown) {
  if (currentStatus === 'online') return;
  await updateDoc(ref, { status: 'online', updatedAt: serverTimestamp() });
}

async function findByEmail(email: string) {
  return getDocs(query(collection(db, 'users'), where('email', '==', email), limit(5)));
}

function roleFields(pre: WorkshopUser): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (pre.role) out.role = pre.role;
  if (pre.tags.length > 0) out.tags = pre.tags;
  if (pre.pin) out.pin = pre.pin;
  return out;
}

async function doSyncUserProfile(authUser: User): Promise<void> {
  const userRef = doc(db, 'users', authUser.uid);
  const emailLower = (authUser.email ?? '').toLowerCase();
  const fallbackName = authUser.displayName || emailLower.split('@')[0] || 'Team Member';
  const snap = await getDoc(userRef);

  if (!snap.exists() && emailLower) {
    const q = await findByEmail(emailLower);
    const preDoc = q.docs.find((d) => d.id !== authUser.uid);
    if (preDoc) {
      const pre = userFromDoc(preDoc.id, preDoc.data());
      await setDoc(
        userRef,
        {
          id: authUser.uid,
          name: pre.name || fallbackName,
          email: emailLower,
          status: 'online',
          createdAt: preDoc.get('createdAt') ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...roleFields(pre),
        },
        { merge: true }
      );
      await deleteDoc(preDoc.ref).catch(() => undefined);
    } else {
      await setDoc(userRef, {
        id: authUser.uid,
        name: fallbackName,
        email: emailLower,
        status: 'online',
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } else if (snap.exists()) {
    const current = userFromDoc(snap.id, snap.data());
    if (!getUserRole(current) && emailLower) {
      const q = await findByEmail(emailLower);
      const preDoc = q.docs.find((d) => d.id !== authUser.uid && getUserRole(userFromDoc(d.id, d.data())) !== null);
      if (preDoc) {
        const pre = userFromDoc(preDoc.id, preDoc.data());
        await setDoc(userRef, { status: 'online', updatedAt: serverTimestamp(), ...roleFields(pre) }, { merge: true });
        await deleteDoc(preDoc.ref).catch(() => undefined);
      } else {
        await markOnline(userRef, snap.get('status'));
      }
    } else {
      await markOnline(userRef, snap.get('status'));
    }
  }

  // Publish the Google photo on the user's own doc so teammates' lists can show it.
  const photoURL = authUser.photoURL || null;
  const stored = (await getDoc(userRef)).get('photoURL') ?? null;
  if (photoURL && photoURL !== stored) {
    await updateDoc(userRef, { photoURL, updatedAt: serverTimestamp() }).catch(() => undefined);
  }

  // Zero-admin bootstrap: the first account on a workshop without an admin becomes its admin.
  const fresh = await getDoc(userRef);
  const profile = fresh.exists() ? userFromDoc(fresh.id, fresh.data()) : null;
  if (profile && !getUserRole(profile) && emailLower) {
    let hasAdmin = !(await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), limit(1)))).empty;
    if (!hasAdmin) {
      hasAdmin = !(await getDocs(query(collection(db, 'users'), where('tags', 'array-contains', 'admin'), limit(1)))).empty;
    }
    if (!hasAdmin) {
      await updateDoc(userRef, { role: 'admin', tags: arrayUnion('admin'), updatedAt: serverTimestamp() });
      await setDoc(
        doc(db, 'settings', 'admin_lock'),
        { adminUid: authUser.uid, adminEmail: emailLower, bootstrappedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => undefined);
    }
  }
}

/** Three tries with a growing pause, like syncUserProfile in the Compose app. */
async function syncUserProfile(authUser: User): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await doSyncUserProfile(authUser);
      return;
    } catch (e) {
      console.warn(`syncUserProfile attempt ${attempt} failed`, e);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 750 * attempt));
    }
  }
}

function googleErrorText(e: unknown): string | null {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  return (e as { message?: string })?.message || "Couldn't sign in with Google. Try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<WorkshopUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeChosenBy, setThemeChosenBy] = useState<Set<string>>(readThemeChosenBy);
  const unsubProfile = useRef<(() => void) | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch(() => undefined);
    const unsub = onAuthStateChanged(auth, (authUser) => {
      unsubProfile.current?.();
      unsubProfile.current = null;
      setUser(authUser);
      if (!authUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      let synced = false;
      unsubProfile.current = onSnapshot(
        doc(db, 'users', authUser.uid),
        (snap) => {
          const p = snap.exists() ? userFromDoc(snap.id, snap.data()) : null;
          setProfile(p);
          // A member with a role can go straight in; otherwise wait for the pre-registration check.
          if (getUserRole(p) !== null || synced) setLoading(false);
        },
        (err) => {
          console.error('Profile listener error', err);
          setLoading(false);
        }
      );
      void syncUserProfile(authUser).finally(() => {
        synced = true;
        setLoading(false);
      });
    });
    return () => {
      unsub();
      unsubProfile.current?.();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return null;
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-email') {
        return "That email and password don't match. Check them and try again.";
      }
      return (e as { message?: string })?.message || "Couldn't sign in. Check your connection and try again.";
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      return null;
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return null;
      }
      return googleErrorText(e);
    }
  }, []);

  const signOut = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      await updateDoc(doc(db, 'users', uid), { status: 'offline', updatedAt: serverTimestamp() }).catch(() => undefined);
    }
    unsubProfile.current?.();
    unsubProfile.current = null;
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const finishThemeChoice = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setThemeChosenBy((prev) => {
      const next = new Set(prev);
      next.add(uid);
      writeThemeChosenBy(next);
      return next;
    });
  }, []);

  const screen: AuthScreen = loading
    ? 'loading'
    : !user
      ? 'unauthenticated'
      : getUserRole(profile) === null
        ? 'pending'
        : !themeChosenBy.has(user.uid)
          ? 'choose-theme'
          : 'authenticated';

  const value = useMemo(
    () => ({ user, profile, screen, signInWithEmail, signInWithGoogle, signOut, finishThemeChoice }),
    [user, profile, screen, signInWithEmail, signInWithGoogle, signOut, finishThemeChoice]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
