import { motion, type Variants } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import type { WorkshopUser } from "../../types";

export interface TagsViewProps {
  newTagInput: string;
  setNewTagInput: (val: string) => void;
  handleCreateTag: () => void;
  availableTags: string[];
  users: WorkshopUser[];
  handleDeleteTag: (tag: string) => void;
  pageVariants?: Variants;
}

export function TagsView({
  newTagInput,
  setNewTagInput,
  handleCreateTag,
  availableTags,
  users,
  handleDeleteTag,
  pageVariants,
}: TagsViewProps) {
  return (
    <motion.div
      key="tags"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* Create New Tag */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">
          Create New Tag
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) =>
              setNewTagInput(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_-]/g, "")
                  .substring(0, 20)
              )
            }
            placeholder="New tag name (e.g. admin, mechanic)"
            className="flex-1 bg-workshop-surface border border-workshop-border/60 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-workshop-text focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateTag();
              }
            }}
          />
          <button
            type="button"
            onClick={handleCreateTag}
            className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tag</span>
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div className="space-y-4 pt-2">
        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">
          Manage Tags
        </label>

        {availableTags.length === 0 ? (
          <div className="py-12 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider border border-dashed border-workshop-border/30 rounded-xl">
            No tags created yet.
          </div>
        ) : (
          <div className="divide-y divide-workshop-border/20 border-y border-workshop-border/20">
            {availableTags.map((tag) => {
              const assignedAdvisors = users.filter((u) => u.tags?.includes(tag));
              return (
                <div key={tag} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-black uppercase tracking-wider rounded-md">
                      {tag}
                    </span>
                    <span className="text-xs text-workshop-muted font-mono">
                      ({assignedAdvisors.length}{" "}
                      {assignedAdvisors.length === 1 ? "advisor" : "advisors"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag)}
                    className="p-1.5 text-workshop-muted hover:text-status-urgent transition-colors rounded cursor-pointer"
                    title={`Delete tag "${tag}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
