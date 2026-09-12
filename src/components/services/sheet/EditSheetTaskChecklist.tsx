import React from "react";
import { cn } from "../../../lib/utils";

export interface EditSheetTaskChecklistProps {
  description: string;
  onChangeDescription: (newDescription: string) => void;
}

export function EditSheetTaskChecklist({
  description,
  onChangeDescription,
}: EditSheetTaskChecklistProps) {
  const parseTasks = (desc: string) => {
    if (!desc) return [];
    return desc
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const isCompleted = line.startsWith("[x] ");
        const text = isCompleted
          ? line.substring(4)
          : line.startsWith("[ ] ")
            ? line.substring(4)
            : line;
        return { text, completed: isCompleted };
      });
  };

  const stringifyTasks = (tasks: { text: string; completed: boolean }[]) => {
    return tasks.map((t) => `${t.completed ? "[x]" : "[ ]"} ${t.text}`).join("\n");
  };

  const tasks = parseTasks(description);
  const completedCount = tasks.filter((t) => t.completed).length;

  const toggleTask = (index: number) => {
    const updated = [...tasks];
    if (updated[index]) {
      updated[index].completed = !updated[index].completed;
      onChangeDescription(stringifyTasks(updated));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
          Checklist
        </label>
        <span className="text-[11px] text-workshop-accent font-bold bg-workshop-accent/10 px-2 py-0.5 rounded-full">
          {completedCount}/{tasks.length} Done
        </span>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
        {tasks.map((task, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => toggleTask(idx)}
            className={cn(
              "w-full flex items-center gap-3.5 p-3 rounded-2xl border transition-all text-left outline-none group/btn",
              task.completed
                ? "bg-status-success/5 border-status-success/20 shadow-inner"
                : "bg-workshop-surface/30 border-workshop-border hover:border-workshop-accent/30 hover:bg-workshop-surface/50"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all text-xs font-black",
                task.completed
                  ? "bg-status-success border-status-success text-workshop-bg shadow-md shadow-status-success/20"
                  : "border-workshop-border bg-workshop-bg group-hover/btn:border-workshop-accent/50"
              )}
            >
              {task.completed && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-workshop-bg"
                >
                  <path d="M2 5 L4.5 7 L8.5 2.5" />
                </svg>
              )}
            </div>
            <span className="relative text-sm font-semibold tracking-tight text-left flex-1 min-w-0">
              <span
                className={cn(
                  "block",
                  task.completed
                    ? "text-workshop-muted opacity-50 font-normal"
                    : "text-workshop-text font-semibold"
                )}
              >
                {task.text}
              </span>
            </span>
          </button>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 border border-dashed border-workshop-border/80 rounded-2xl bg-workshop-surface/15">
            <p className="text-xs text-workshop-muted font-bold italic">
              No specific service tasks outlined for this check-in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
