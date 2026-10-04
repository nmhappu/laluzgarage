import React, { useState } from "react";
import { ListChecks, Plus, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import { cn } from "../../../lib/utils";

export interface EditSheetTaskChecklistProps {
  description: string;
  onChangeDescription: (newDescription: string) => void;
}

export function EditSheetTaskChecklist({
  description,
  onChangeDescription,
}: EditSheetTaskChecklistProps) {
  const [newTaskText, setNewTaskText] = useState("");

  const parseTasks = (desc: string) => {
    if (!desc) return [];
    return desc
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => {
        const isCompleted = line.startsWith("[x] ");
        const text = isCompleted
          ? line.substring(4).trim()
          : line.startsWith("[ ] ")
            ? line.substring(4).trim()
            : line;
        return { text, completed: isCompleted };
      });
  };

  const stringifyTasks = (tasks: { text: string; completed: boolean }[]) => {
    return tasks.map((t) => `${t.completed ? "[x]" : "[ ]"} ${t.text}`).join("\n");
  };

  const tasks = parseTasks(description);
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (index: number) => {
    const updated = [...tasks];
    if (updated[index]) {
      updated[index].completed = !updated[index].completed;
      onChangeDescription(stringifyTasks(updated));
    }
  };

  const deleteTask = (index: number) => {
    const updated = tasks.filter((_, i) => i !== index);
    onChangeDescription(stringifyTasks(updated));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    const updated = [...tasks, { text: trimmed, completed: false }];
    onChangeDescription(stringifyTasks(updated));
    setNewTaskText("");
  };

  return (
    <div className="bg-workshop-card/80 border border-workshop-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 font-sans">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center text-workshop-accent shrink-0">
            <ListChecks className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text leading-tight">
            Service Tasks
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-workshop-accent bg-workshop-accent/10 border border-workshop-accent/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
            <NumberFlow value={completedCount} />
            <span className="opacity-50">/</span>
            <NumberFlow value={tasks.length} />
            <span className="ml-0.5 uppercase tracking-wider text-[10px]">Done</span>
          </span>
        </div>
      </div>

      {/* Progress Bar (if tasks exist) */}
      {tasks.length > 0 && (
        <div className="w-full bg-workshop-surface/60 rounded-full h-1.5 overflow-hidden border border-workshop-border/40">
          <div
            className="h-full bg-status-success transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Quick Add Task Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTask(e);
              }
            }}
            placeholder="Add a task (e.g. Brake pad change, Engine oil)..."
            className="w-full bg-workshop-surface/50 border border-workshop-border/80 focus:border-workshop-accent px-3.5 py-2.5 rounded-xl outline-none text-xs font-semibold text-workshop-text placeholder:text-workshop-muted/50 focus:ring-1 focus:ring-workshop-accent transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleAddTask}
          disabled={!newTaskText.trim()}
          className="px-3 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
          title="Add task"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Add</span>
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {tasks.map((task, idx) => (
            <motion.div
              key={`${task.text}-${idx}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left",
                task.completed
                  ? "bg-status-success/5 border-status-success/20 text-workshop-muted"
                  : "bg-workshop-surface/30 border-workshop-border/60 hover:border-workshop-border hover:bg-workshop-surface/50 text-workshop-text"
              )}
            >
              {/* Checkbox and task text */}
              <button
                type="button"
                onClick={() => toggleTask(idx)}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left outline-none"
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all text-xs font-black",
                    task.completed
                      ? "bg-status-success border-status-success text-workshop-bg shadow-xs"
                      : "border-workshop-border bg-workshop-bg group-hover:border-workshop-accent/60"
                  )}
                >
                  {task.completed && <Check className="w-3 h-3 text-workshop-bg stroke-[3]" />}
                </div>

                <span
                  className={cn(
                    "text-xs font-medium tracking-normal truncate transition-all",
                    task.completed
                      ? "line-through text-workshop-muted opacity-60"
                      : "text-workshop-text font-semibold"
                  )}
                >
                  {task.text}
                </span>
              </button>

              {/* Delete task button */}
              <button
                type="button"
                onClick={() => deleteTask(idx)}
                className="p-1 rounded-lg text-workshop-muted hover:text-status-urgent hover:bg-status-urgent/10 transition-colors opacity-70 group-hover:opacity-100 shrink-0 ml-2 cursor-pointer outline-none"
                title="Remove task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="text-center py-6 border border-dashed border-workshop-border/70 rounded-xl bg-workshop-surface/10">
            <p className="text-xs text-workshop-muted font-medium">
              No service tasks listed yet. Use the field above to add tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
