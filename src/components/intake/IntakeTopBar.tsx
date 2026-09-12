import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { getHighQualityAvatarUrl } from '../../lib/avatar';
import { getUserRole } from '../../types';
import {
  getRoleRingClass,
  getRoleFallbackStyle,
  getRoleLabel,
} from '../nav/types';
import { MorphText } from '../ui/MorphText';
import { cn } from '../../lib/utils';

export interface IntakeTopBarProps {
  title?: string;
  m3Icon?: string;
  onBack: () => void;
  showBack?: boolean;
}

export function IntakeTopBar({
  title = 'Vehicle Intake',
  m3Icon = 'assignment',
  onBack,
  showBack = true,
}: IntakeTopBarProps) {
  const { user, profile } = useAuth();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.photoURL]);

  const rawPhoto = user?.photoURL || (profile as any)?.photoURL;
  const avatarUrl = !imageError ? getHighQualityAvatarUrl(rawPhoto, 256) : null;
  const initialLetter = (
    profile?.name?.[0] ||
    user?.displayName?.[0] ||
    user?.email?.[0] ||
    'A'
  ).toUpperCase();

  const role = getUserRole(profile);
  const roleRingClass = getRoleRingClass(role);
  const roleFallbackStyle = getRoleFallbackStyle(role);
  const roleLabel = getRoleLabel(role);

  return (
    <header className="sticky top-0 z-30 bg-workshop-bg shrink-0 border-b border-workshop-border/20 w-full">
      <div className="safe-top" />
      <div className="h-16 flex items-center justify-between px-5 sm:px-6">
        {/* Left Side: Back Navigation & Dynamic Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-workshop-surface/80 rounded-lg transition-colors text-workshop-muted hover:text-workshop-text flex items-center justify-center shrink-0 cursor-pointer"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <MorphText className="text-workshop-text text-base font-logo font-bold tracking-tight truncate">
              {title}
            </MorphText>
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-xl select-none text-workshop-accent"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {m3Icon}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: ThemeToggle & User Role Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle className="w-8 h-8 rounded-lg" />

          <NavLink
            to="/settings"
            className={cn(
              'ml-1 relative rounded-full p-0.5 ring-2 transition-all active:scale-95 flex items-center justify-center focus:outline-none',
              roleRingClass
            )}
            title={`Profile & Settings (${roleLabel})`}
            aria-label={`Profile & Settings (${roleLabel})`}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold transition-colors',
                roleFallbackStyle.bg,
                roleFallbackStyle.text
              )}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.name || user?.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="font-bold uppercase text-[11px]">
                  {initialLetter}
                </span>
              )}
            </div>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
