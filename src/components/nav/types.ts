import { LayoutDashboard, Package, ClipboardList, History, LucideIcon } from 'lucide-react';

export interface NavItemConfig {
  to: string;
  icon: LucideIcon;
  m3Icon: string;
  label: string;
}

export const navItems: NavItemConfig[] = [
  { to: '/', icon: LayoutDashboard, m3Icon: 'grid_view', label: 'Dashboard' },
  { to: '/vehicles', icon: History, m3Icon: 'directions_car', label: 'Vehicle' },
  { to: '/inventory', icon: Package, m3Icon: 'inventory_2', label: 'Inventory' },
  { to: '/services', icon: ClipboardList, m3Icon: 'build', label: 'Services' },
];

export const getActiveTabLabel = (pathname: string): string => {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/vehicles')) return 'Vehicle Registry';
  if (pathname.startsWith('/inventory')) return 'Parts Inventory';
  if (pathname.startsWith('/services')) return 'Service History';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/intake')) return 'Vehicle Intake';
  return 'Dashboard';
};

export const getNavTitle = (pathname: string): string => {
  if (pathname === '/') return 'LaluZ Garage';
  return getActiveTabLabel(pathname);
};

export const getActiveTabM3Icon = (pathname: string): string => {
  if (pathname === '/') return 'grid_view';
  if (pathname.startsWith('/vehicles')) return 'directions_car';
  if (pathname.startsWith('/inventory')) return 'inventory_2';
  if (pathname.startsWith('/services')) return 'build';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/intake')) return 'assignment';
  return 'grid_view';
};

export const getActiveTabColor = (pathname: string): string => {
  if (pathname.startsWith('/vehicles')) return 'text-secondary';
  return 'text-workshop-accent';
};

export const getTabAccentColor = (to: string): string => {
  if (to === '/vehicles') return 'text-secondary';
  return 'text-workshop-accent';
};

export const getActiveTabPillClass = (to: string): string => {
  if (to === '/vehicles') {
    return 'bg-secondary/15';
  }
  return 'bg-workshop-accent/15';
};

export const TAB_ACTIVE_WIDTHS: Record<string, number> = {
  '/': 116,          // Dashboard
  '/vehicles': 102,   // Vehicle
  '/inventory': 114, // Inventory
  '/services': 110,  // Services
};

export const SERVICE_STATUS_FILTERS = [
  { id: 'all', label: 'All Logs', color: 'bg-secondary' },
  { id: 'pending', label: 'Pending', color: 'bg-status-urgent' },
  { id: 'in-progress', label: 'In-Progress', color: 'bg-status-pending' },
  { id: 'completed', label: 'Completed', color: 'bg-workshop-accent' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-workshop-muted' },
] as const;

import type { UserRole } from '../../types';

export const getRoleRingClass = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'admin':
      return 'ring-status-urgent hover:ring-status-urgent/80 shadow-sm shadow-status-urgent/25';
    case 'technician':
      return 'ring-status-success hover:ring-status-success/80 shadow-sm shadow-status-success/25';
    case 'assistant':
      return 'ring-sky-400 hover:ring-sky-300 shadow-sm shadow-sky-400/25';
    default:
      return 'ring-workshop-border/80 hover:ring-workshop-accent/70';
  }
};

export const getRoleFallbackStyle = (role: UserRole | null | undefined): { bg: string; text: string } => {
  switch (role) {
    case 'admin':
      return { bg: 'bg-status-urgent/15', text: 'text-status-urgent' };
    case 'technician':
      return { bg: 'bg-status-success/15', text: 'text-status-success' };
    case 'assistant':
      return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
    default:
      return { bg: 'bg-workshop-surface', text: 'text-workshop-accent' };
  }
};

export const getRoleLabel = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'technician':
      return 'Technician';
    case 'assistant':
      return 'Assistant';
    default:
      return 'Team Member';
  }
};

