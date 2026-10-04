import React, { useRef, useEffect } from 'react';
import { Search } from '../ui/SearchIcon';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DesktopSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function DesktopSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  autoFocus = false,
}: DesktopSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "hidden md:flex items-center relative h-10 w-64 lg:w-72 bg-workshop-card/80 hover:bg-workshop-card border border-workshop-border focus-within:border-workshop-accent/70 focus-within:ring-2 focus-within:ring-workshop-accent/20 rounded-xl transition-all shadow-xs group",
        className
      )}
    >
      <div className="pl-3 pr-2 flex items-center justify-center shrink-0 pointer-events-none text-workshop-muted group-focus-within:text-workshop-accent transition-colors">
        <Search className="w-4 h-4" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="w-full bg-transparent border-none pl-0 pr-8 py-2 text-xs font-semibold text-workshop-text placeholder:text-workshop-muted/50 focus:outline-none uppercase tracking-wide"
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 p-1 rounded-md text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface transition-colors cursor-pointer active:scale-95"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd
          className="hidden lg:inline-flex items-center justify-center absolute right-2.5 h-5 px-1.5 text-[10px] font-mono font-bold text-workshop-muted/70 bg-workshop-surface/90 border border-workshop-border/80 rounded select-none pointer-events-none"
          title="Press / to search"
        >
          /
        </kbd>
      )}
    </div>
  );
}
