import React from 'react';
import { ArrowLeft, RefreshCw, Plus, Search, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';

export function getSettingsHeaderInfo(pathname: string): { title: string; colorClass: string } {
  if (pathname === '/settings' || pathname === '/settings/') {
    return { title: 'Settings', colorClass: 'text-workshop-text' };
  }
  if (pathname === '/settings/accounts') {
    return { title: 'Accounts', colorClass: 'text-status-success' };
  }
  if (pathname === '/settings/accounts/new') {
    return { title: 'Create Advisor', colorClass: 'text-status-success' };
  }
  if (pathname.startsWith('/settings/accounts/')) {
    return { title: 'Edit Advisor', colorClass: 'text-status-success' };
  }
  if (pathname === '/settings/general') {
    return { title: 'General Settings', colorClass: 'text-workshop-secondary' };
  }
  if (pathname === '/settings/whatsapp') {
    return { title: 'WhatsApp Presets', colorClass: 'text-emerald-500' };
  }
  if (pathname === '/settings/tags') {
    return { title: 'Tags', colorClass: 'text-indigo-400' };
  }
  if (pathname === '/settings/system') {
    return { title: 'System Diagnostics', colorClass: 'text-amber-500' };
  }
  if (pathname === '/settings/history') {
    return { title: 'Date-wise Service History', colorClass: 'text-workshop-accent' };
  }
  if (pathname === '/settings/statistics') {
    return { title: 'Statistics', colorClass: 'text-workshop-accent' };
  }
  if (pathname === '/settings/updates') {
    return { title: 'App Updates', colorClass: 'text-workshop-accent' };
  }
  return { title: 'Settings', colorClass: 'text-workshop-text' };
}

export interface SettingsTopBarProps {
  pathname: string;
  isRootSettings: boolean;
  isAccountsList: boolean;
  isDateHistory: boolean;
  loading: boolean;
  onBack: () => void;
  onRefreshUsers?: () => void;
  onNewAdvisor?: () => void;
  showStickySearch: boolean;
  setShowStickySearch: (show: boolean) => void;
  stickySearchInputRef: React.RefObject<HTMLInputElement | null>;
  dateSearchQuery: string;
  setDateSearchQuery: (query: string) => void;
  dateFilter: string | null;
  setDateFilter: (filter: string | null) => void;
  dateInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenDateFilter: () => void;
}

export function SettingsTopBar({
  pathname,
  isRootSettings,
  isAccountsList,
  isDateHistory,
  loading,
  onBack,
  onRefreshUsers,
  onNewAdvisor,
  showStickySearch,
  setShowStickySearch,
  stickySearchInputRef,
  dateSearchQuery,
  setDateSearchQuery,
  dateFilter,
  setDateFilter,
  dateInputRef,
  onOpenDateFilter,
}: SettingsTopBarProps) {
  const headerInfo = getSettingsHeaderInfo(pathname);

  return (
    <div className="sticky top-0 z-40 bg-workshop-card border-b border-workshop-border shrink-0">
      <div className="safe-top" />
      <div className="h-16 flex items-center justify-between px-5 sm:px-6">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            id="settings-back-button"
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-workshop-surface/80 rounded-lg transition-colors text-workshop-muted hover:text-workshop-text flex items-center justify-center shrink-0 cursor-pointer"
            title={isRootSettings ? 'Back to Dashboard' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className={cn('text-base font-black tracking-tight leading-none', headerInfo.colorClass)}>
              {headerInfo.title}
            </h2>
          </div>
        </div>

        {/* Action Group on the Right */}
        <div className="flex items-center gap-3 shrink-0">
          {isRootSettings && (
            <ThemeToggle className="w-8 h-8 rounded-lg" />
          )}

          {isAccountsList && (
            <>
              <button
                type="button"
                id="accounts-refresh-btn"
                onClick={onRefreshUsers}
                className="p-2 hover:bg-workshop-surface rounded-lg transition-colors text-workshop-muted hover:text-workshop-text cursor-pointer"
                title="Refresh Accounts"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
              <button
                type="button"
                id="accounts-create-btn"
                onClick={onNewAdvisor}
                className="flex items-center gap-1.5 text-xs font-black text-status-success hover:brightness-110 uppercase tracking-widest bg-status-success/5 border border-status-success/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Advisor</span>
              </button>
            </>
          )}

          {isDateHistory && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="date-history-search-btn"
                onClick={() => {
                  setShowStickySearch(true);
                  setTimeout(() => stickySearchInputRef.current?.focus(), 50);
                }}
                className={cn(
                  'p-2 text-workshop-muted hover:text-workshop-text transition-colors rounded-lg cursor-pointer relative',
                  (dateSearchQuery || dateFilter) && 'text-workshop-accent'
                )}
                title="Search"
              >
                <Search className="w-5 h-5" />
                {(dateSearchQuery || dateFilter) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-workshop-accent" />
                )}
              </button>
              <button
                type="button"
                id="date-history-calendar-btn"
                onClick={onOpenDateFilter}
                className={cn(
                  'p-2 transition-colors rounded-lg cursor-pointer relative',
                  dateFilter
                    ? 'text-workshop-accent bg-workshop-accent/10'
                    : 'text-workshop-muted hover:text-workshop-text'
                )}
                title="Filter by date"
              >
                <Calendar className="w-5 h-5" />
                {dateFilter && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-workshop-accent" />
                )}
              </button>

              {/* Hidden native Date Picker Input */}
              <input
                ref={dateInputRef}
                type="date"
                value={dateFilter || ''}
                onChange={(e) => setDateFilter(e.target.value || null)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded Sticky Search Bar for Date-wise History */}
      <AnimatePresence>
        {isDateHistory && showStickySearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-x-0 top-0 bg-workshop-surface flex flex-col z-50 border-b border-workshop-border shadow-md"
          >
            <div className="safe-top" />
            <div className="h-16 flex items-center justify-between px-5 sm:px-6">
              <div className="flex items-center gap-3 flex-1 mr-4">
                <Search className="w-5 h-5 text-workshop-muted shrink-0" />
                <input
                  ref={stickySearchInputRef}
                  type="text"
                  value={dateSearchQuery}
                  onChange={(e) => setDateSearchQuery(e.target.value)}
                  placeholder="Search plate, vehicle, customer, or date..."
                  className="w-full bg-transparent border-none outline-none text-sm text-workshop-text placeholder:text-workshop-muted/50 font-medium py-2"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDateSearchQuery('');
                  setShowStickySearch(false);
                }}
                className="p-2 text-workshop-muted hover:text-workshop-text transition-colors shrink-0 cursor-pointer"
                title="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
