import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { readCustomTags } from '../../data/repository';
import { getUserRole, userFromDoc, type WorkshopUser } from '../../types';

/** Tags that mirror a role; they are managed through the role picker, never as skill tags. */
const ROLE_TAGS = new Set(['admin', 'owner', 'manager', 'tech', 'technician', 'mechanic', 'assistant', 'helper', 'trainee']);

export function skillTags(u: WorkshopUser): string[] {
  return u.tags.map((t) => t.trim().toLowerCase()).filter((t) => t && !ROLE_TAGS.has(t));
}

/** Live team list, sorted by name, plus every skill tag in use (SettingsViewModel.onOpen). */
export function useTeam(enabled: boolean) {
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => userFromDoc(d.id, d.data())).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))),
      (e) => setError(`Couldn't load the team. ${e.message}`)
    );
  }, [enabled]);
  const tags = useMemo(() => {
    const names = new Set<string>();
    readCustomTags()
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && !ROLE_TAGS.has(t))
      .forEach((t) => names.add(t));
    users.forEach((u) => skillTags(u).forEach((t) => names.add(t)));
    return [...names];
  }, [users]);
  const awaitingRole = users.filter((u) => getUserRole(u) === null).length;
  return { users, tags, awaitingRole, error };
}
