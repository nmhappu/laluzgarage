import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { type WorkshopUser, type UserRole, getUserRole } from "../types";

export function useWorkshopUsers(
  onError: (msg: string | null) => void,
  onSuccess: (msg: string | null) => void
) {
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Profile Editor states
  const [selectedUser, setSelectedUser] = useState<WorkshopUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Editor form values
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState<"online" | "offline">("offline");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState<UserRole | "">("");
  const [formTags, setFormTags] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const snap = await getDocs(collection(db, "users"));
      const userList = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkshopUser);
      userList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(userList);
    } catch (e) {
      console.error(e);
      onError("Failed to fetch workshop team members.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSelectUser = (u: WorkshopUser) => {
    setSelectedUser(u);
    setIsCreating(false);
    setFormName(u.name || "");
    setFormEmail(u.email || "");
    setFormRole(getUserRole(u) || "");
    setFormStatus(u.status || "offline");
    setFormPin(u.pin || "");
    setFormTags(u.tags || []);
    onError(null);
    onSuccess(null);
  };

  const handleStartCreate = () => {
    setSelectedUser(null);
    setIsCreating(true);
    setFormName("");
    setFormEmail("");
    setFormRole("technician");
    setFormStatus("offline");
    setFormPin("");
    setFormTags([]);
    onError(null);
    onSuccess(null);
  };

  const handleSaveUserProfile = async (e: FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (!formEmail.trim()) {
      onError("Email address is required.");
      return false;
    }
    if (formPin && !/^\d{4}$/.test(formPin)) {
      onError("Security PIN must be exactly 4 digits.");
      return false;
    }

    setSavingId(selectedUser?.id || "new");
    onError(null);
    onSuccess(null);

    try {
      const newName = formName.trim() || formEmail.split("@")[0];

      const mergedTags = new Set(
        (formTags || []).filter((t) => !["admin", "tech", "technician", "assistant"].includes(t))
      );
      if (formRole === "admin") {
        mergedTags.add("admin");
      } else if (formRole === "technician") {
        mergedTags.add("tech");
      } else if (formRole === "assistant") {
        mergedTags.add("assistant");
      }
      const finalTags = Array.from(mergedTags);

      if (isCreating) {
        await addDoc(collection(db, "users"), {
          name: newName,
          email: formEmail.trim().toLowerCase(),
          role: formRole || null,
          status: formStatus,
          pin: formPin || null,
          tags: finalTags,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onSuccess(`New team member "${newName}" created successfully!`);
        await fetchUsers();
        return true;
      } else if (selectedUser) {
        const userRef = doc(db, "users", selectedUser.id);
        await updateDoc(userRef, {
          name: newName,
          email: formEmail.trim().toLowerCase(),
          role: formRole || null,
          status: formStatus,
          pin: formPin || null,
          tags: finalTags,
          updatedAt: serverTimestamp(),
        });

        if (auth.currentUser && selectedUser.id === auth.currentUser.uid) {
          try {
            await updateProfile(auth.currentUser, { displayName: newName });
          } catch (authError) {
            console.error("Error syncing auth displayName:", authError);
          }
        }

        onSuccess(`User "${formName}" updated successfully!`);
        await fetchUsers();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      onError("Failed to save user profile.");
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async (): Promise<boolean> => {
    if (!userToDelete) return false;
    const { id, name } = userToDelete;

    setDeletingId(id);
    onError(null);
    onSuccess(null);

    try {
      await deleteDoc(doc(db, "users", id));
      onSuccess(`Advisor "${name}" deleted successfully.`);
      setSelectedUser(null);
      setUserToDelete(null);
      await fetchUsers();
      return true;
    } catch (e) {
      console.error(e);
      onError("Failed to delete advisor.");
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  return {
    users,
    loading,
    savingId,
    deletingId,
    userToDelete,
    setUserToDelete,
    selectedUser,
    isCreating,
    formName,
    setFormName,
    formEmail,
    setFormEmail,
    formStatus,
    setFormStatus,
    formPin,
    setFormPin,
    formRole,
    setFormRole,
    formTags,
    setFormTags,
    fetchUsers,
    handleSelectUser,
    handleStartCreate,
    handleSaveUserProfile,
    handleDeleteUser,
    confirmDeleteUser,
  };
}
