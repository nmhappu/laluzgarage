import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
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
  sortOrder?: 'newest' | 'oldest';
  onToggleSort?: () => void;
}

export function ServiceHistoryTabs({
  tabs,
  activeTab,
  onSelectTab,
  sortOrder,
  onToggleSort,
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

        {/* Desktop Sort (arrow) button */}
        {sortOrder && onToggleSort && (
          <div className="hidden md:flex ml-auto items-center pl-4 pr-1">
            <button
              type="button"
              onClick={onToggleSort}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none active:scale-95 cursor-pointer",
                "bg-workshop-card/80 hover:bg-workshop-card border border-workshop-border/80 text-workshop-text hover:border-workshop-accent/40 shadow-sm",
                sortOrder === 'oldest' && "border-workshop-accent/50 text-workshop-accent bg-workshop-accent/10"
              )}
              title={`Sort: ${sortOrder === 'newest' ? 'Newest first (click for oldest)' : 'Oldest first (click for newest)'}`}
            >
              <span className="font-sans font-bold tracking-tight text-workshop-text text-xs">Sort</span>
              <motion.span
                animate={{ rotate: sortOrder === 'oldest' ? 180 : 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className="flex items-center justify-center text-workshop-accent shrink-0"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </motion.span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
