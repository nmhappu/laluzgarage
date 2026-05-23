import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Portal } from '../Portal';

// Helper function to format date strings for display (e.g. "Fri, May 22, 2026" or "May 22, 2026")
const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;
  
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatHeaderSelectedDate = (dateStr: string): string => {
  if (!dateStr) return 'Select date';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MaterialCalendarProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

export function MaterialCalendar({
  value,
  onChange,
  min,
  max,
  className,
  placeholder = 'Select date',
  id
}: MaterialCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value || '');
  
  // Track currently viewed month/year in the grid picker
  const [viewYear, setViewYear] = useState<number>(() => {
    const active = value || new Date().toISOString().split('T')[0];
    return parseInt(active.split('-')[0], 10);
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const active = value || new Date().toISOString().split('T')[0];
    return parseInt(active.split('-')[1], 10) - 1;
  });

  // Keep view in sync when outer selected value changes
  useEffect(() => {
    if (value) {
      setTempDate(value);
      const parts = value.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value]);

  // Support hardware/app back button to close open calendar popover cleanly
  useEffect(() => {
    if (!isOpen) return;

    const handleBackButton = (e: Event) => {
      e.preventDefault();
      setIsOpen(false);
    };

    window.addEventListener('appBackButton', handleBackButton);
    return () => {
      window.removeEventListener('appBackButton', handleBackButton);
    };
  }, [isOpen]);

  const handleOpen = () => {
    // Reset temporary state when opening
    setTempDate(value);
    const active = value || new Date().toISOString().split('T')[0];
    const parts = active.split('-');
    if (parts.length === 3) {
      setViewYear(parseInt(parts[0], 10));
      setViewMonth(parseInt(parts[1], 10) - 1);
    }
    setIsOpen(true);
  };

  const handleDaySelect = (selectedDayStr: string) => {
    setTempDate(selectedDayStr);
    // Directly close and select for a highly intuitive M3 calendar experience
    onChange(selectedDayStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate date grid for current viewing Year/Month
  const generateDays = () => {
    const year = viewYear;
    const month = viewMonth;

    // Previous month info
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthIndex = month === 0 ? 11 : month - 1;
    const totalDaysInPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();

    // Current month info
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

    const cells: Array<{
      dateStr: string;
      day: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = totalDaysInPrevMonth - i;
      const mm = String(prevMonthIndex + 1).padStart(2, '0');
      const dateStr = `${prevMonthYear}-${mm}-${String(day).padStart(2, '0')}`;
      const isDisabled = isDateDisabled(dateStr);
      
      cells.push({
        dateStr,
        day,
        isCurrentMonth: false,
        isDisabled,
        isToday: dateStr === todayStr,
        isSelected: dateStr === tempDate
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dateStr = `${year}-${mm}-${String(day).padStart(2, '0')}`;
      const isDisabled = isDateDisabled(dateStr);

      cells.push({
        dateStr,
        day,
        isCurrentMonth: true,
        isDisabled,
        isToday: dateStr === todayStr,
        isSelected: dateStr === tempDate
      });
    }

    // Trailing days of next month to complete the layout to multiples of 7
    const remaining = 42 - cells.length;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthIndex = month === 11 ? 0 : month + 1;

    for (let day = 1; day <= remaining; day++) {
      const mm = String(nextMonthIndex + 1).padStart(2, '0');
      const dateStr = `${nextMonthYear}-${mm}-${String(day).padStart(2, '0')}`;
      const isDisabled = isDateDisabled(dateStr);

      cells.push({
        dateStr,
        day,
        isCurrentMonth: false,
        isDisabled,
        isToday: dateStr === todayStr,
        isSelected: dateStr === tempDate
      });
    }

    return cells;
  };

  const isDateDisabled = (dateStr: string) => {
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const displayVal = formatDateForDisplay(value);

  return (
    <>
      {/* Trigger display button replicating input field styling */}
      <button
        id={id}
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full bg-workshop-surface border border-workshop-border px-4 rounded-xl outline-none text-left flex items-center justify-between text-workshop-text hover:border-workshop-accent/50 transition-all cursor-pointer select-none",
          // Adapt padding/height to look exactly page compatible
          className
        )}
      >
        <span className={cn(
          "truncate font-bold",
          !value && "text-workshop-muted font-normal text-sm"
        )}>
          {displayVal || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-workshop-muted shrink-0 ml-2" />
      </button>

      {/* Material 3 Styled Calendar Dialog */}
      <AnimatePresence>
        {isOpen && (
          <Portal>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[490] bg-black/75 flex items-center justify-center p-4"
            >
              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[328px] overflow-hidden rounded-[28px] border border-workshop-border bg-[#16181D] shadow-[0_12px_48px_rgba(0,0,0,0.6)] flex flex-col font-sans"
              >
                {/* Visual Header in Material Design 3 Spec */}
                <div className="bg-[#1F2228] px-6 py-5 border-b border-workshop-border/30">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted mb-1">
                    Select Date
                  </div>
                  <div className="text-2xl font-black text-workshop-text tracking-tight mt-0.5 truncate">
                    {formatHeaderSelectedDate(tempDate)}
                  </div>
                </div>

                {/* Calendar Pane */}
                <div className="p-4 flex flex-col">
                  {/* Month & Year Navigation Row */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2 rounded-full text-workshop-text hover:bg-workshop-surface/60 active:scale-95 transition-all outline-none"
                    >
                      <ChevronLeft className="w-5 h-5 text-workshop-muted hover:text-workshop-text transition-colors" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-workshop-text tracking-tight uppercase">
                        {MONTHS[viewMonth]} {viewYear}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2 rounded-full text-workshop-text hover:bg-workshop-surface/60 active:scale-95 transition-all outline-none"
                    >
                      <ChevronRight className="w-5 h-5 text-workshop-muted hover:text-workshop-text transition-colors" />
                    </button>
                  </div>

                  {/* Weekday Grid Headers */}
                  <div className="grid grid-cols-7 text-center mb-1.5">
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] font-bold text-workshop-muted w-9 h-9 flex items-center justify-center uppercase tracking-wider"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days grid */}
                  <div className="grid grid-cols-7 gap-y-1">
                    {generateDays().map((cell, idx) => {
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-center p-0.5 aspect-square relative"
                        >
                          <button
                            type="button"
                            disabled={cell.isDisabled}
                            onClick={() => handleDaySelect(cell.dateStr)}
                            className={cn(
                              "w-8 h-8 rounded-full text-xs font-bold transition-all relative flex items-center justify-center outline-none select-none",
                              cell.isCurrentMonth
                                ? "text-workshop-text"
                                : "text-workshop-muted opacity-30",
                              cell.isToday && !cell.isSelected && "border-2 border-workshop-accent text-workshop-accent font-black",
                              cell.isSelected
                                ? "bg-workshop-accent text-workshop-bg font-black shadow-lg shadow-workshop-accent/25 scale-105"
                                : "hover:bg-workshop-surface/75 active:scale-90",
                              cell.isDisabled && "opacity-10 cursor-not-allowed hover:bg-transparent pointer-events-none"
                            )}
                          >
                            {cell.day}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Footer Controls */}
                <div className="px-6 pb-5 pt-1 border-t border-workshop-border/20 flex justify-end gap-3 bg-[#131519]">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/30 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tempDate) {
                        onChange(tempDate);
                      }
                      setIsOpen(false);
                    }}
                    className="px-5 py-2 bg-workshop-accent text-workshop-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 shadow-sm transition-all"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}
