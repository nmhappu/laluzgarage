import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { WorkshopUser } from "../types";

export function useWorkshopTags(
  users: WorkshopUser[],
  onError: (msg: string | null) => void,
  onSuccess: (msg: string | null) => void,
  onRefetchUsers: () => Promise<void>
) {
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("workshop_custom_tags");
      return saved ? JSON.parse(saved) : ["tech"];
    } catch {
      return ["tech"];
    }
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Dynamically calculate all tags in database + customTags
  useEffect(() => {
    const tagsSet = new Set<string>(customTags);
    users.forEach((u) => {
      if (u.tags && Array.isArray(u.tags)) {
        u.tags.forEach((t) => {
          if (t && typeof t === "string") {
            tagsSet.add(t.trim().toLowerCase());
          }
        });
      }
    });
    setAvailableTags(Array.from(tagsSet));
  }, [users, customTags]);

  const handleCreateTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (trimmed.length > 20) {
      onError("Tag name must be 20 characters or less.");
      return;
    }
    if (availableTags.includes(trimmed)) {
      onError(`Tag "${trimmed}" already exists.`);
      return;
    }
    const updated = Array.from(new Set([...customTags, trimmed]));
    setCustomTags(updated);
    try {
      localStorage.setItem("workshop_custom_tags", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setNewTagInput("");
    onSuccess(`Tag "${trimmed}" created.`);
    setTimeout(() => onSuccess(null), 3000);
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    const updatedCustom = customTags.filter((t) => t !== tagToDelete);
    setCustomTags(updatedCustom);
    try {
      localStorage.setItem("workshop_custom_tags", JSON.stringify(updatedCustom));
    } catch (e) {
      console.error(e);
    }

    const usersWithTag = users.filter((u) => u.tags?.includes(tagToDelete));
    for (const u of usersWithTag) {
      try {
        const userRef = doc(db, "users", u.id);
        const newTags = (u.tags || []).filter((t) => t !== tagToDelete);
        await updateDoc(userRef, {
          tags: newTags,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error removing tag from user:", e);
      }
    }
    await onRefetchUsers();
    onSuccess(`Tag "${tagToDelete}" deleted.`);
    setTimeout(() => onSuccess(null), 3000);
  };

  return {
    customTags,
    availableTags,
    newTagInput,
    setNewTagInput,
    handleCreateTag,
    handleDeleteTag,
  };
}
