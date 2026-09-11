import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { useBackHandler } from "../../contexts/UIContext";

export interface ServiceHistoryTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    bg: string;
    border: string;
  }>;
  activeTab: string;
  onSelectTab: (tabId: "all" | "pending" | "in-progress" | "completed" | "cancelled") => void;
}

export function ServiceHistoryTabs({
  tabs,
  activeTab,
  onSelectTab,
}: ServiceHistoryTabsProps) {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  useBackHandler(() => {
    setFilterDropdownOpen(false);
    return true;
  }, filterDropdownOpen, 40);

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
      <div className="w-full xl:w-72 relative min-w-0 z-30">
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className="w-full flex items-center justify-between gap-3 bg-workshop-surface/80 border border-workshop-border/80 hover:border-workshop-accent/50 text-workshop-text px-4 py-3 rounded-xl outline-none select-none transition-all shadow-sm cursor-pointer font-sans text-xs font-black uppercase tracking-wider h-[46px]"
            id="status-filter-dropdown"
          >
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shadow-sm shrink-0",
                  activeTabObj.color?.replace("text-", "bg-") || "bg-workshop-secondary"
                )}
              />
              <span className="truncate">{activeTabObj.label}</span>
              <span className="text-[10px] bg-workshop-border/40 text-workshop-muted px-1.5 py-0.5 rounded font-sans font-black tabular-nums">
                {activeTabObj.count}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-workshop-muted transition-transform duration-200 shrink-0",
                filterDropdownOpen && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {filterDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent [-webkit-tap-highlight-color:transparent] outline-none border-none"
                  onClick={() => setFilterDropdownOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 bg-workshop-card border border-workshop-border rounded-xl shadow-xl z-50 overflow-hidden py-1.5 min-w-[200px]"
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(
                            tab.id as
                              | "all"
                              | "pending"
                              | "in-progress"
                              | "completed"
                              | "cancelled"
                          );
                          setFilterDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all select-none text-left cursor-pointer outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]",
                          isActive
                            ? "text-workshop-accent bg-workshop-surface/80"
                            : "text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/45"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shadow-sm shrink-0",
                              tab.color?.replace("text-", "bg-") || "bg-workshop-muted"
                            )}
                          />
                          <span className="font-sans truncate">{tab.label}</span>
                        </span>
                        <span className="text-[10px] bg-workshop-border/30 px-1.5 py-0.5 rounded font-sans opacity-80 font-black tabular-nums">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
