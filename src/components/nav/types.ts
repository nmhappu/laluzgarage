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

export const SERVICE_STATUS_FILTERS = [
  { id: 'all', label: 'All Logs', color: 'bg-secondary' },
  { id: 'pending', label: 'Pending', color: 'bg-status-urgent' },
  { id: 'in-progress', label: 'In-Progress', color: 'bg-status-pending' },
  { id: 'completed', label: 'Completed', color: 'bg-workshop-accent' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-workshop-muted' },
] as const;
