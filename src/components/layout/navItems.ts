import {
  Home,
  Calendar,
  CheckCircle2,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string; // compact label for the bottom bar
  longLabel: string; // full label for the sidebar
  icon: LucideIcon;
  accent?: boolean; // the Quick Mark action, rendered prominently
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Home', longLabel: 'Dashboard', icon: Home },
  { to: '/calendar', label: 'Calendar', longLabel: 'Calendar', icon: Calendar },
  {
    to: '/quick-mark',
    label: 'Mark',
    longLabel: 'Quick Mark',
    icon: CheckCircle2,
    accent: true,
  },
  { to: '/settings', label: 'Settings', longLabel: 'Settings', icon: Settings },
];
