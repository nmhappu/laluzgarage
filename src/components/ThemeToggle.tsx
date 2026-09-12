import { useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    // Pass the actual button element directly so coordinates are guaranteed 100% exact
    toggleTheme(buttonRef.current || e);
  };

  return (
    <button
      ref={buttonRef}
      data-theme-toggle
      onClick={handleClick}
      className={cn(
        "relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200",
        "bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 active:bg-workshop-card/80",
        className
      )}
      aria-label="Toggle theme"
      title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div className="text-workshop-accent flex items-center justify-center">
        {theme === 'dark' ? (
          <Moon className="w-5 h-5 fill-workshop-accent/10 transition-transform duration-700 rotate-0" />
        ) : (
          <Sun className="w-5 h-5 transition-transform duration-700 rotate-90" />
        )}
      </div>
    </button>
  );
}
