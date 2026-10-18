import type { ReactNode } from 'react';
import { cn } from '../../core/format';
import { IconButton } from '../../ui/components';
import { TopBar } from '../../ui/chrome';

/**
 * A settings page (SettingsPage): top bar with back, a scrolling body capped at the phone-first
 * width, an optional pinned bottom bar. As a [pane] (two-pane layouts) it drops the back arrow.
 */
export function SettingsFrame({
  title,
  onBack,
  trailing,
  bottomBar,
  pane = false,
  children,
}: {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
  bottomBar?: ReactNode;
  pane?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-surface">
      {pane ? (
        <header className="flex min-h-16 items-center gap-2 px-2 pt-2">
          <h2 className="m-0 flex-1 text-on-surface t-headline-sm">{title}</h2>
          {trailing}
        </header>
      ) : (
        <TopBar startPadding={4}>
          {onBack && <IconButton icon="arrowBackShort" label="Back" onClick={onBack} className="text-on-surface" />}
          <h1 className="m-0 flex-1 truncate text-on-surface t-title-lg">{title}</h1>
          {trailing}
        </TopBar>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn('w-full', !pane && 'mx-auto max-w-[640px]')}>{children}</div>
      </div>
      {bottomBar}
    </div>
  );
}
