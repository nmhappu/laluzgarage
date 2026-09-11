import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Auto scroll active tab into view smoothly (Groww-style interaction)
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && containerRef.current) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeTab]);

  return (
    <div className="w-full relative select-none">
      {/* Scrollable Tab Row with bottom baseline border */}
      <div
        ref={containerRef}
        className="flex items-center gap-1 sm:gap-2 md:gap-3 overflow-x-auto no-scrollbar scroll-smooth border-b border-workshop-border/60 relative px-0.5"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              onClick={() =>
                onSelectTab(
                  tab.id as
                    | "all"
                    | "pending"
                    | "in-progress"
                    | "completed"
                    | "cancelled"
                )
              }
              className={cn(
                "relative flex items-center gap-2 py-3 px-3 sm:px-4 shrink-0 transition-colors duration-150 outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] cursor-pointer",
                isActive
                  ? "text-workshop-text font-semibold"
                  : "text-workshop-muted hover:text-workshop-text/80 font-medium"
              )}
            >
              {/* Subtle status indicator dot */}
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0 transition-all duration-150",
                  isActive ? "opacity-100 scale-100" : "opacity-40 scale-90",
                  tab.color?.replace("text-", "bg-") || "bg-workshop-secondary"
                )}
              />

              {/* Tab Title */}
              <span className="text-sm tracking-tight whitespace-nowrap">
                {tab.label}
              </span>

              {/* Tab Count Badge */}
              <span
                className={cn(
                  "text-xs font-bold tabular-nums px-2 py-0.5 rounded-full transition-all",
                  isActive
                    ? "bg-workshop-surface text-workshop-text border border-workshop-border shadow-2xs"
                    : "bg-workshop-surface/40 text-workshop-muted/70"
                )}
              >
                {tab.count}
              </span>

              {/* Sliding Underline Indicator (Groww-Style) */}
              {isActive && (
                <motion.div
                  layoutId="serviceHistoryActiveTabUnderline"
                  className="absolute -bottom-px inset-x-1.5 h-[3px] bg-workshop-text rounded-full z-10"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 32,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
